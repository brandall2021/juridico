-- Esquema de la app juridico (tablas propias; la vista dbo.google es solo lectura)
-- Ejecutar con: node scripts/seed.js  (o sqlcmd)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_usuarios' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.app_usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(80) NOT NULL UNIQUE,
    password_hash NVARCHAR(200) NOT NULL,
    nombre NVARCHAR(120) NOT NULL,
    rol NVARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_expedientes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.app_expedientes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    centro_judicial VARCHAR(40) NULL,
    unidad_judicial VARCHAR(60) NULL,
    expdte VARCHAR(15) NULL,
    actor VARCHAR(100) NULL,
    demandado VARCHAR(100) NULL,
    fecha NVARCHAR(4000) NULL,
    descripcion VARCHAR(200) NULL,
    documento VARCHAR(300) NULL,
    fecha_procesado NVARCHAR(4000) NULL,
    estado VARCHAR(2) NULL,
    origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    creado_por INT NULL,
    creado_en DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO
