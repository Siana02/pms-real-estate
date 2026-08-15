use App\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::apiResource('organizations', OrganizationController::class);