export const INDEX_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sitio en Construcción - Odisea Cloud</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050B14;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        .container {
            text-align: center;
            z-index: 10;
            max-width: 600px;
            padding: 40px;
            background: rgba(10, 20, 36, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 163, 255, 0.15);
            border-radius: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 163, 255, 0.1);
        }
        .logo {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #00A3FF;
            margin-bottom: 30px;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin: 0 0 20px 0;
            background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .badge {
            display: inline-block;
            padding: 8px 16px;
            background: rgba(0, 163, 255, 0.1);
            border: 1px solid rgba(0, 163, 255, 0.2);
            color: #00E5FF;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 20px;
        }
        .glow {
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(0, 163, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="container">
        <div class="logo">Odisea Cloud</div>
        <div class="badge">Nuevo Sitio Web</div>
        <h1>Tu sitio está listo</h1>
        <p>Esta es la página temporal de bienvenida. Sube tus archivos a la carpeta <strong>public_html</strong> para reemplazarla y publicar tu sitio web.</p>
    </div>
</body>
</html>`;

export const ERROR_404_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página No Encontrada - 404</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050B14;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        .container {
            text-align: center;
            z-index: 10;
            max-width: 600px;
            padding: 40px;
            background: rgba(10, 20, 36, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 75, 75, 0.15);
            border-radius: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 75, 75, 0.05);
        }
        .logo {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #00A3FF;
            margin-bottom: 30px;
        }
        .error-code {
            font-size: 6rem;
            font-weight: 800;
            margin: 0;
            line-height: 1;
            background: linear-gradient(135deg, #ff4b4b 0%, #ff8585 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 10px 0 20px 0;
            color: #ffffff;
        }
        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #00A3FF;
            color: #ffffff;
            text-decoration: none;
            border-radius: 16px;
            font-weight: 600;
            font-size: 0.95rem;
            box-shadow: 0 10px 20px rgba(0, 163, 255, 0.2);
            transition: all 0.2s;
        }
        .btn:hover {
            background: #008EE0;
            transform: translateY(-2px);
        }
        .glow {
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255, 75, 75, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="container">
        <div class="logo">Odisea Cloud</div>
        <div class="error-code">404</div>
        <h1>Página no encontrada</h1>
        <p>El recurso solicitado no existe o ha sido movido temporalmente. Por favor, verifica la dirección URL o regresa al inicio.</p>
        <a href="/" class="btn">Volver al Inicio</a>
    </div>
</body>
</html>`;

export const ERROR_500_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Interno del Servidor - 500</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050B14;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        .container {
            text-align: center;
            z-index: 10;
            max-width: 600px;
            padding: 40px;
            background: rgba(10, 20, 36, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(245, 158, 11, 0.15);
            border-radius: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(245, 158, 11, 0.05);
        }
        .logo {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #00A3FF;
            margin-bottom: 30px;
        }
        .error-code {
            font-size: 6rem;
            font-weight: 800;
            margin: 0;
            line-height: 1;
            background: linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 10px 0 20px 0;
            color: #ffffff;
        }
        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #00A3FF;
            color: #ffffff;
            text-decoration: none;
            border-radius: 16px;
            font-weight: 600;
            font-size: 0.95rem;
            box-shadow: 0 10px 20px rgba(0, 163, 255, 0.2);
            transition: all 0.2s;
        }
        .btn:hover {
            background: #008EE0;
            transform: translateY(-2px);
        }
        .glow {
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="container">
        <div class="logo">Odisea Cloud</div>
        <div class="error-code">500</div>
        <h1>Error interno del servidor</h1>
        <p>Ha ocurrido un problema de conexión temporal en el servidor. Estamos trabajando en solucionarlo lo antes posible. Por favor, intenta recargar la página en unos minutos.</p>
        <a href="javascript:location.reload()" class="btn">Recargar Página</a>
    </div>
</body>
</html>`;

export const ERROR_503_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servicio No Disponible - 503</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050B14;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        .container {
            text-align: center;
            z-index: 10;
            max-width: 600px;
            padding: 40px;
            background: rgba(10, 20, 36, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 229, 255, 0.15);
            border-radius: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 229, 255, 0.05);
        }
        .logo {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #00A3FF;
            margin-bottom: 30px;
        }
        .error-code {
            font-size: 6rem;
            font-weight: 800;
            margin: 0;
            line-height: 1;
            background: linear-gradient(135deg, #00e5ff 0%, #00a3ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 10px 0 20px 0;
            color: #ffffff;
        }
        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            background: rgba(0, 163, 255, 0.1);
            border: 1px solid rgba(0, 163, 255, 0.2);
            color: #00E5FF;
            text-decoration: none;
            border-radius: 16px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s;
        }
        .btn:hover {
            background: rgba(0, 163, 255, 0.2);
            transform: translateY(-2px);
        }
        .glow {
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="container">
        <div class="logo">Odisea Cloud</div>
        <div class="error-code">503</div>
        <h1>Servicio temporalmente fuera de línea</h1>
        <p>El sitio web está experimentando tareas de mantenimiento o una sobrecarga temporal de tráfico. Volveremos a estar en línea muy pronto.</p>
        <a href="javascript:location.reload()" class="btn">Reintentar Conexión</a>
    </div>
</body>
</html>`;
