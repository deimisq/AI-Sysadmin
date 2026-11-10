# Windows 0.10.0-preview.38

- El acompañante detecta destinos RDP y usa un modo de asesoramiento sobre Windows, sin registro SSH, captura de pantalla ni control del escritorio.
- Se ocultan tareas avanzadas y permisos SSH en el panel RDP. El servicio nativo impide registrar propuestas ejecutables en ese modo, incluso si el proveedor devuelve un comando.
- La conversación conserva el contexto de preguntas anteriores en destinos RDP guardados y temporales; las credenciales quedan excluidas del contexto enviado.
- La interfaz explica cómo compartir errores y salidas manualmente. La selección del archivo de respaldo dispone de un campo de contraseña de restauración independiente del de exportación.

Compatibilidad: no cambia el formato del inventario ni de las copias cifradas. No se modifica la ejecución SSH. El modo RDP no ofrece visión permanente ni automatización del escritorio.

Validación: pruebas automatizadas con datos sintéticos; la prueba de extremo a extremo en un equipo RDP real queda pendiente.
