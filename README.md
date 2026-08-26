# Tipiti

Tipiti é um aplicativo colaborativo para organizar compras domésticas. Ele permite criar e compartilhar listas, registrar compras e preços por mercado e acompanhar o histórico de gastos.

O cliente será Android nativo (Kotlin). Este repositório contém o backend em Django REST Framework com PostgreSQL.

## Iniciar o backend

Pré-requisitos: Python 3.12+, Docker e Redis.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
docker compose up -d db
docker run --name tipiti-redis -d -p 6379:6379 redis:7-alpine
python manage.py migrate
python manage.py runserver
```

A API estará em `http://127.0.0.1:8000/`. Para as próximas execuções, ative o ambiente virtual, garanta que PostgreSQL e Redis estão em execução e rode `python manage.py runserver`.

## Variáveis de ambiente

O Django carrega `backend/.env` automaticamente. Use-o para o desenvolvimento local:

| Variável | Uso |
| --- | --- |
| `DJANGO_SECRET_KEY` | Chave da aplicação. |
| `DJANGO_DEBUG` | Use `True` apenas localmente. |
| `POSTGRES_DB` | Nome do banco. |
| `POSTGRES_USER` | Usuário do PostgreSQL. |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL. |

Para pré-produção, configure `backend/.env.preprod`: defina uma URL pública, chaves fortes para `DJANGO_SECRET_KEY` e `MEDIA_ENCRYPTION_KEY`, hosts/origens permitidos, credenciais do PostgreSQL e `REDIS_URL`.

Os dois arquivos são locais e ignorados pelo Git. Se não for usar o storage S3 local, acrescente `USE_VERSITYGW=False` ao `.env`.

## Testes

```bash
cd backend
uv run pytest                 # suíte completa
uv run pytest tests/unit -q   # unitários sem banco, com MagicMock
uv run mutmut run "*membership_for*"  # mutação focada
```
