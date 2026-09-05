# Security Architecture

## 1. Secrets Management
- All API keys (OpenAQ, NASA, IBM, Mapbox) are stored in `.env`.
- `.env` is explicitly included in `.gitignore`.
- `.env.example` is maintained with placeholder keys.

## 2. API Security
- **CORS**: Strictly defined allowed origins (production Vercel URL and local `localhost:3000`).
- **Rate Limiting**: FastAPI `slowapi` or custom middleware to prevent abuse of expensive quantum/mapping endpoints.

## 3. Database Security
- **API-only Access**: No direct connections allowed from the frontend.
- **Tokens**: Short-lived (60s TTL) access tokens for internal route protection.
- **SQL Injection**: Parameterized queries enforced via SQLAlchemy or strict SQLite wrappers.

## 4. Frontend Security
- **XSS**: React automatically escapes inputs; dangerouslySetInnerHTML is strictly prohibited.
- **Secrets**: No backend secrets (`OPENAQ_API_KEY`, etc.) are exposed via `NEXT_PUBLIC_` variables.
