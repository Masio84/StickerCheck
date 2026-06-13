# StickerCheck

SaaS para gestionar colecciones de cromos con **scanner de álbum**. Marca automáticamente los stickers pegados fotografiando una página del álbum.

Inspirado en [CromoCheck](https://cromocheck.com/), con la funcionalidad extra de escaneo por cámara.

## Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Base de datos / Auth:** Supabase
- **Scanner:** Tesseract.js (OCR) + detección de contraste por celda
- **Deploy:** Vercel

## Funcionalidades MVP

- Landing page con tema oscuro
- Registro e inicio de sesión (email/contraseña)
- Checklist interactivo (Mundial 2026 Panini)
- Filtros: todos, pendientes, marcados, repetidos
- Búsqueda por nombre, código o número
- Scanner de álbum: cámara o subida de imagen
- Detección automática de cromos pegados + OCR
- Revisión manual antes de guardar

## Configuración local

### 1. Clonar e instalar

```bash
git clone https://github.com/Masio84/StickerCheck.git
cd StickerCheck
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Rellena con tus credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 3. Base de datos

En el [SQL Editor de Supabase](https://supabase.com/dashboard), ejecuta el contenido de:

```
supabase/migrations/001_initial.sql
```

### 4. Seed de datos

```bash
npm install -D tsx
npx tsx scripts/seed-world-cup-2026.ts
```

### 5. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

1. Conecta el repo `Masio84/StickerCheck` en [vercel.com](https://vercel.com)
2. Añade las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático en cada push a `main`

## Estructura

```
src/
├── app/                  # Páginas Next.js
├── components/           # UI (checklist, scanner, layout)
├── lib/
│   ├── supabase/         # Cliente Supabase
│   ├── scanner/          # Grid, detección, OCR
│   └── seed-data.ts      # Datos Mundial 2026
scripts/
└── seed-world-cup-2026.ts
supabase/
└── migrations/           # Schema SQL
```

## Scanner — cómo funciona

1. El usuario selecciona página y dimensiones de cuadrícula (filas × columnas)
2. Captura foto o sube imagen del álbum
3. La imagen se divide en celdas
4. Por celda: se analiza varianza de color y densidad de bordes
5. Celdas "llenas" se procesan con OCR (Tesseract.js)
6. Se mapea cada celda a un cromo del catálogo
7. El usuario revisa y confirma antes de guardar

## Próximas fases

- Perfil de usuario y contactos
- Listas compartidas
- Más colecciones
- Google OAuth
- Corrección de perspectiva
- Vision API para mejorar precisión del scanner

## Licencia

MIT
