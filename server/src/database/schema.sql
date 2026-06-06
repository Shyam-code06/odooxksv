-- PostgreSQL Schema Setup for VendorBridge
-- All tables and columns must use strictly lowercase singular naming with no underscores, hyphens, or spaces.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role Table
CREATE TABLE IF NOT EXISTS role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permission Table
CREATE TABLE IF NOT EXISTS permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RolePermission Table (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS rolepermission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roleid UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permissionid UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rolepermissionidunique UNIQUE (roleid, permissionid)
);

-- User Table
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phonenumber VARCHAR(50),
    username VARCHAR(100) NOT NULL UNIQUE,
    passwordhash VARCHAR(255) NOT NULL,
    roleid UUID NOT NULL REFERENCES role(id),
    isactive BOOLEAN NOT NULL DEFAULT TRUE,
    createdby UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updatedby UUID REFERENCES "user"(id) ON DELETE SET NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session Table
CREATE TABLE IF NOT EXISTS session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userid UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    refreshtoken TEXT NOT NULL UNIQUE,
    expiresat TIMESTAMP WITH TIME ZONE NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    isrevoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- AuditLog Table
CREATE TABLE IF NOT EXISTS auditlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userid UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    oldvalue JSONB,
    newvalue JSONB,
    ipaddress VARCHAR(45),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SystemSetting Table
CREATE TABLE IF NOT EXISTS systemsetting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settingkey VARCHAR(100) NOT NULL UNIQUE,
    settingvalue TEXT,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby UUID REFERENCES "user"(id) ON DELETE SET NULL
);

-- INDEXES
-- Indexing foreign keys and frequently searched columns to optimize query performance (designed for millions of records)
CREATE INDEX IF NOT EXISTS idx_user_roleid ON "user"(roleid);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);

CREATE INDEX IF NOT EXISTS idx_rolepermission_roleid ON rolepermission(roleid);
CREATE INDEX IF NOT EXISTS idx_rolepermission_permissionid ON rolepermission(permissionid);

CREATE INDEX IF NOT EXISTS idx_session_userid ON session(userid);
CREATE INDEX IF NOT EXISTS idx_session_refreshtoken ON session(refreshtoken);

CREATE INDEX IF NOT EXISTS idx_auditlog_userid ON auditlog(userid);
CREATE INDEX IF NOT EXISTS idx_auditlog_createdat ON auditlog(createdat);

CREATE INDEX IF NOT EXISTS idx_systemsetting_key ON systemsetting(settingkey);
