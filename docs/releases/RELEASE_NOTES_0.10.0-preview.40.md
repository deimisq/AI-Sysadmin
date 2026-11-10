# Windows 0.10.0-preview.40

- Contexto visual opcional para IA en RDP: captura del control remoto activo, vista previa, descarte y autorización explícita para adjuntar a una pregunta.
- Transporte multimodal para Gemini/OpenAI, Claude y modelos visuales en endpoints compatibles como Ollama. OpenCode y DeepSeek se rechazan explícitamente para imágenes en esta versión.
- Las imágenes son instantáneas, no observación continua. Permanecen en memoria y no se guardan en historial, respaldos ni archivos. El análisis textual sí puede conservarse como parte del chat.
- Se valida revisión, destino RDP, tamaño, formato y dimensiones. No se usan capturas del monitor local como fallback. Los comandos y permisos de SSH siguen sin aplicarse a RDP.
- Un HTTP 400 con imagen informa que debe revisarse la compatibilidad visual del modelo; no se reenvía la pregunta automáticamente.

Validación automatizada con imágenes, inventarios y proveedores sintéticos; la prueba de captura sobre una sesión RDP real queda pendiente. Algunos controles ActiveX pueden devolver imágenes negras: la vista previa permite descartarlas y compartir texto en su lugar.
