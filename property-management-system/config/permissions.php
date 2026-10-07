<?php

return [
    'catalog' => [
        'properties.manage' => ['Properties', 'Manage properties'],
        'units.manage' => ['Properties', 'Manage units'],
        'tenants.manage' => ['Tenancy', 'Manage tenants'],
        'leases.manage' => ['Tenancy', 'Create and edit leases'],
        'maintenance.manage' => ['Operations', 'Manage maintenance'],
        'payments.view' => ['Finance', 'View payment records'],
        'payments.record' => ['Finance', 'Record received payments'],
        'payments.edit' => ['Finance', 'Edit recorded payments'],
        'payments.void' => ['Finance', 'Void/correct payment records'],
        'payments.refund' => ['Finance', 'Process or approve refunds'],
        'deposits.adjust' => ['Finance', 'Adjust deposit records'],
        'expenses.manage' => ['Finance', 'Record and manage expenses'],
        'expenses.approve' => ['Finance', 'Approve sensitive expenses'],
        'financial.reports.view' => ['Finance', 'View financial reports'],
        'team.view' => ['Administration', 'View team'],
        'team.invite' => ['Administration', 'Invite employees'],
        'team.manage' => ['Administration', 'Manage employee roles and status'],
        'permissions.manage' => ['Administration', 'Grant employee permissions'],
        'organization.settings' => ['Administration', 'Manage organization settings'],
        'organization.branding' => ['Administration', 'Manage organization branding'],
        'payment_accounts.manage' => ['Finance', 'Manage organization payment destinations'],
        'audit.view' => ['Security', 'View the organization audit log'],
        'requests.manage' => ['Administration', 'Review employee requests'],
        'requests.create' => ['Operations', 'Create requests for owner review'],
    ],
    'employee_grantable' => [
        'properties.manage',
        'units.manage',
        'tenants.manage',
        'leases.manage',
        'maintenance.manage',
        'payments.record',
        'requests.create',
    ],

    'role_defaults' => [
        'property_manager' => [
            'properties.manage', 'units.manage', 'tenants.manage', 'leases.manage',
            'maintenance.manage', 'payments.record',
            'requests.create',
        ],
        'staff' => [
            'properties.manage', 'units.manage', 'tenants.manage', 'leases.manage',
            'maintenance.manage', 'payments.record',
            'requests.create',
        ],
        'tenant' => [],
    ],
];