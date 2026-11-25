# Ciber CEI POS — Frontend

Interfaz web de **Punto de Venta (POS)** para gestión de caja, catálogo y stock, historial de ventas, arqueo de caja, administración de usuarios y reportes gráficos de ventas y utilidad diaria, conectada al backend (`ciber-cei-backend`) con persistencia en MongoDB.

## Módulos y funcionalidades

* **Caja / POS:** venta rápida de artículos y servicios, búsqueda y escaneo de código de barras, selección de medio de pago (*Efectivo*, *Transferencia*, *Tarjeta*) y emisión de comprobantes / facturación ARCA.
* **Catálogo y Stock:** alta, edición, eliminación y edición rápida de precios y stock, incluyendo precio de compra (`precioCompra`), cálculo de margen y vista ampliada de imágenes.
* **Historial de Ventas:** consulta de ventas realizadas con sincronización con el backend.
* **Arqueo de Caja:** control y cierre de caja por jornada.
* **Gestión de Usuarios:** acceso mediante inicio de sesión y administración de cuentas de usuario.
* **Gráfico de Ventas y Utilidad del Día:** comparativa diaria de ventas (mes actual vs. mes anterior) y gráfico de torta de utilidad diaria calculado restando el costo real (`(precio - precioCompra) * cantidad`).

## Stack tecnológico

* **React** + **TypeScript**
* **Vite**
* **Tailwind CSS**
* **pnpm**

## Configuración del entorno

Creá un archivo `.env` en la raíz del proyecto con la URL base de la API del backend:

```env
VITE_API_URL=http://localhost:4000/api