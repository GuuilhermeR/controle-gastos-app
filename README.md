# Controle de Gastos Pessoal

Aplicação completa para registrar entradas e despesas, acompanhar dashboards, visualizar gráficos e avaliar tendências financeiras.

## Stack

- Frontend: React, TypeScript, Vite, Ant Design e Recharts
- Backend: ASP.NET Core Minimal API, Entity Framework Core e SQLite

## Recursos

- CRUD de lançamentos financeiros
- Cadastro de entradas e despesas com categoria, data, valor e forma de pagamento
- Dashboard com entradas, despesas, saldo e taxa de economia
- Gráfico mensal de entradas x despesas
- Gráfico de despesas por categoria
- Tendência de saldo mensal
- Insights automáticos sobre comportamento de gastos
- Exportação CSV

## Rodar localmente

Backend:

```bash
cd backend
dotnet run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Build para deploy

Backend:

```bash
cd backend
dotnet publish -c Release -o publish
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

O frontend gerado fica em `frontend/dist`. Configure `VITE_API_URL` com a URL pública da API antes do build quando o frontend e o backend estiverem em domínios diferentes.

## Variáveis de ambiente

Frontend:

- `VITE_API_URL`: URL pública da API em produção.

Backend:

- `ConnectionStrings__DefaultConnection`: string de conexão SQLite.

## Endpoints principais

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET /api/dashboard`
- `GET /api/health`
