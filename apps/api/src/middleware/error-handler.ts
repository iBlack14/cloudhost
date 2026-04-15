import type { ErrorRequestHandler } from "express";

// FIX: Mejorado para capturar y manejar diferentes tipos de errores
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("[odisea-api:error]", error);

  // Validar JSON inválido
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "JSON inválido en el body"
      }
    });
  }

  // Usuario no encontrado
  if (error instanceof Error && error.message === "NO_USER_FOUND") {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Usuario no autenticado"
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor"
    }
  });
};
