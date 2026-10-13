<?php

namespace Tests\Feature;

use App\Models\DarajaC2bEvent;
use App\Models\DarajaC2bRegistration;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Services\DarajaC2bRoutingService;
use App\Services\PaymentReconciliationService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Group;

#[Group('parallel-mpesa')]
class DarajaConcurrentCallbackTest extends TestCase
{
    public function test_concurrent_duplicate_c2b_callbacks_create_one_event_payment_and_allocation(): void
    {
        if (!function_exists('pcntl_fork') || !function_exists('stream_socket_pair')) {
            $this->markTestSkipped('Parallel callback verification requires pcntl and Unix socket support.');
        }

        $created = $this->createDestinationAndLease();
        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'parallel-callback-token'),
            'callback_token' => 'parallel-callback-token',
            'status' => 'registered',
            'registered_at' => now(),
        ]);

        $payload = [
            'BusinessShortCode' => '123456',
            'TransID' => 'PARALLELC2B001',
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => 'LEASE-' . $created['organization_id'],
            'TransTime' => '20260109120000',
        ];
        $registrationId = $registration->id;
        $workers = [];
        $resultPrefix = sys_get_temp_dir() . '/pms-c2b-race-' . bin2hex(random_bytes(8));

        // Each worker gets a separate MySQL connection after fork and is released
        // from a barrier at nearly the same time to exercise unique-key and row-lock
        // behavior, rather than only replaying callbacks sequentially.
        for ($worker = 0; $worker < 2; $worker++) {
            $sockets = stream_socket_pair(STREAM_PF_UNIX, STREAM_SOCK_STREAM, STREAM_IPPROTO_IP);
            $this->assertIsArray($sockets);
            $pid = pcntl_fork();
            if ($pid === -1) {
                $this->fail('Could not fork callback worker.');
            }

            if ($pid === 0) {
                fclose($sockets[0]);
                fread($sockets[1], 1);
                DB::purge();
                DB::reconnect();

                try {
                    $registration = DarajaC2bRegistration::findOrFail($registrationId);
                    $event = app(DarajaC2bRoutingService::class)->receive(
                        $registration,
                        $payload,
                        app(PaymentReconciliationService::class)
                    );
                    file_put_contents($resultPrefix . '.' . $worker, json_encode([
                        'ok' => true,
                        'event_id' => $event->id,
                        'status' => $event->status,
                    ]));
                    fclose($sockets[1]);
                    exit(0);
                } catch (\Throwable $exception) {
                    file_put_contents($resultPrefix . '.' . $worker, json_encode([
                        'ok' => false,
                        'error' => $exception::class . ': ' . $exception->getMessage(),
                    ]));
                    fclose($sockets[1]);
                    exit(1);
                }
            }

            fclose($sockets[1]);
            $workers[] = ['pid' => $pid, 'socket' => $sockets[0], 'result' => $resultPrefix . '.' . $worker];
        }

        foreach ($workers as $worker) {
            fwrite($worker['socket'], '1');
            fclose($worker['socket']);
        }

        foreach ($workers as $worker) {
            pcntl_waitpid($worker['pid'], $status);
            $this->assertTrue(pcntl_wifexited($status), 'Callback worker did not exit normally.');
            $this->assertSame(0, pcntl_wexitstatus($status), (string) @file_get_contents($worker['result']));
            $result = json_decode((string) file_get_contents($worker['result']), true);
            $this->assertTrue($result['ok'] ?? false, json_encode($result));
            @unlink($worker['result']);
        }

        $this->assertSame(1, DarajaC2bEvent::where('environment', 'sandbox')->where('receipt', 'PARALLELC2B001')->count());
        $this->assertSame(1, PaymentTransaction::where('provider', 'mpesa_daraja')->where('external_transaction_id', 'PARALLELC2B001')->count());
        $this->assertSame(1, Payment::where('provider_transaction_id', 'PARALLELC2B001')->count());
        $this->assertSame(1, DB::table('payment_allocations')->count());
        $this->assertSame('routed', DarajaC2bEvent::where('receipt', 'PARALLELC2B001')->firstOrFail()->status);
    }

    private function createDestinationAndLease(): array
    {
        $now = now();
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Concurrent Callback Properties',
            'email' => 'concurrent-callbacks@example.test',
            'country' => 'Kenya',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $propertyId = DB::table('properties')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'Concurrent Callback Building',
            'country' => 'Kenya',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $unitId = DB::table('units')->insertGetId([
            'property_id' => $propertyId,
            'unit_number' => '18',
            'monthly_rent' => 25000,
            'status' => 'occupied',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $tenantId = DB::table('tenants')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'Concurrent',
            'last_name' => 'Tenant',
            'email' => 'concurrent-tenant@example.test',
            'phone' => '0712345678',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('leases')->insert([
            'organization_id' => $organizationId,
            'property_id' => $propertyId,
            'unit_id' => $unitId,
            'tenant_id' => $tenantId,
            'tenant_payment_reference' => 'LEASE-' . $organizationId,
            'start_date' => '2026-01-01',
            'end_date' => null,
            'monthly_rent' => 25000,
            'deposit_amount' => 0,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $destinationId = DB::table('payment_destinations')->insertGetId([
            'organization_id' => $organizationId,
            'property_id' => $propertyId,
            'method' => 'mpesa_paybill',
            'label' => 'Rent PayBill',
            'details' => json_encode(['paybill' => '123456', 'account' => 'Rent']),
            'is_active' => true,
            'daraja_shortcode_type' => 'PayBill',
            'daraja_passkey' => null,
            'daraja_callback_token' => null,
            'daraja_authorization_status' => 'awaiting_merchant_authorization',
            'account_reference_format' => 'LEASE-{organization}',
            'c2b_registration_status' => 'registered',
            'c2b_authorization_status' => 'ready',
            'c2b_authorization_checked_at' => $now,
            'c2b_registered_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return ['organization_id' => $organizationId, 'property_id' => $propertyId, 'unit_id' => $unitId, 'tenant_id' => $tenantId, 'destination_id' => $destinationId];
    }
}
