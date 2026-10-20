# School Clinic Management System

## Start frontend + backend automatically

From this project root:

```powershell
npm install
npm run dev
```

`npm run dev` starts both services automatically:

- Frontend: Vite (`http://localhost:5173`, or the next free port)
- Backend: Express API (`http://localhost:8080`)
- Clinic data: `backend/clinic-data.json`

You do **not** need to open a second terminal for `backend/server.js` when using `npm run dev`.

## Backend data

The backend starts with:

```json
{
  "students": [],
  "visits": [],
  "medicines": []
}
```

Data added through the frontend is written to `backend/clinic-data.json`.

Firebase Authentication remains in `src/Firebase.js` and is independent from the Express clinic-data storage.
