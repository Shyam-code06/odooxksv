-- Seed script for VendorBridge ERP (Admin Module)

-- Insert Roles
INSERT INTO role (id, name, description) VALUES
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', 'Admin', 'Super administrator with full access to all system features.'),
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', 'Manager', 'ERP manager responsible for reviewing, auditing, and overseeing operations.'),
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', 'ProcurementOfficer', 'Procurement officer managing vendors and purchase flows.'),
('b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3', 'Vendor', 'Vendor user representing a supplier registered on the ERP portal.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Insert Permissions
INSERT INTO permission (id, name, description) VALUES
('10000000-0000-0000-0000-000000000001', 'login', 'Ability to authenticate and log into the system.'),
('10000000-0000-0000-0000-000000000002', 'logout', 'Ability to terminate system sessions.'),
('10000000-0000-0000-0000-000000000003', 'changepassword', 'Ability to change one''s own password.'),
('10000000-0000-0000-0000-000000000004', 'dashboard', 'Access to the administration dashboard overview.'),
('10000000-0000-0000-0000-000000000005', 'createmanager', 'Ability to create new Manager accounts.'),
('10000000-0000-0000-0000-000000000006', 'createprocurementofficer', 'Ability to create new Procurement Officer accounts.'),
('10000000-0000-0000-0000-000000000007', 'viewusers', 'Ability to view list of all users.'),
('10000000-0000-0000-0000-000000000008', 'editusers', 'Ability to update user accounts (excluding roles).'),
('10000000-0000-0000-0000-000000000009', 'activateuser', 'Ability to activate/enable user accounts.'),
('10000000-0000-0000-0000-000000000010', 'deactivateuser', 'Ability to deactivate/disable user accounts.'),
('10000000-0000-0000-0000-000000000011', 'resetuserpassword', 'Ability to reset passwords for other users.'),
('10000000-0000-0000-0000-000000000012', 'viewactivitylogs', 'Access to view system audit trails and logs.'),
('10000000-0000-0000-0000-000000000013', 'viewstatistics', 'Access to view system operations metrics and reports.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Insert Admin RolePermissions (All 13 Permissions)
INSERT INTO rolepermission (roleid, permissionid) VALUES
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000001'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000002'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000003'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000004'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000005'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000006'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000007'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000008'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000009'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000010'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000011'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000012'),
('d1b0337c-f230-4e1b-ae23-1d07b46ee334', '10000000-0000-0000-0000-000000000013')
ON CONFLICT (roleid, permissionid) DO NOTHING;

-- Insert Manager RolePermissions
INSERT INTO rolepermission (roleid, permissionid) VALUES
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', '10000000-0000-0000-0000-000000000001'), -- login
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', '10000000-0000-0000-0000-000000000002'), -- logout
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', '10000000-0000-0000-0000-000000000003'), -- changepassword
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', '10000000-0000-0000-0000-000000000004'), -- dashboard
('4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', '10000000-0000-0000-0000-000000000013')  -- viewstatistics
ON CONFLICT (roleid, permissionid) DO NOTHING;

-- Insert ProcurementOfficer RolePermissions
INSERT INTO rolepermission (roleid, permissionid) VALUES
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', '10000000-0000-0000-0000-000000000001'), -- login
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', '10000000-0000-0000-0000-000000000002'), -- logout
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', '10000000-0000-0000-0000-000000000003'), -- changepassword
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', '10000000-0000-0000-0000-000000000004'), -- dashboard
('e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', '10000000-0000-0000-0000-000000000007')  -- viewusers
ON CONFLICT (roleid, permissionid) DO NOTHING;

-- Insert Vendor RolePermissions
INSERT INTO rolepermission (roleid, permissionid) VALUES
('b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3', '10000000-0000-0000-0000-000000000001'), -- login
('b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3', '10000000-0000-0000-0000-000000000002'), -- logout
('b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3', '10000000-0000-0000-0000-000000000003'), -- changepassword
('b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3', '10000000-0000-0000-0000-000000000004')  -- dashboard
ON CONFLICT (roleid, permissionid) DO NOTHING;

-- Insert default Administrator User
-- password is Admin@123, hashed using bcrypt (rounds=10)
INSERT INTO "user" (id, firstname, lastname, email, phonenumber, username, passwordhash, roleid, isactive) VALUES
('c7b0337c-f230-4e1b-ae23-1d07b46ee334', 'System', 'Admin', 'admin@vendorbridge.com', '+15550199', 'admin', '$2b$10$gmqZEccLU5zVBkUsHSF8huR7zb/PGg3MeKtR8pGSDMis/aUuFoT0a', 'd1b0337c-f230-4e1b-ae23-1d07b46ee334', TRUE)
ON CONFLICT (username) DO UPDATE SET passwordhash = EXCLUDED.passwordhash, isactive = EXCLUDED.isactive;
