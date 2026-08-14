# Environment Variables (.env)

Copy `.env.example` to `.env` and fill in the values. `.env` is git-ignored; only `.env.example` is committed.

```
PORT=
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## MONGODB_URI

Mongoose connection string. The project uses MongoDB Atlas (no local MongoDB). Replace the placeholders with your Atlas cluster credentials:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/serviceprovider?retryWrites=true&w=majority
```

- Create the cluster/database user in the Atlas dashboard, then copy the connection string from **Connect → Drivers → Node.js**.
- Set `serviceprovider` as the database name in the URI (or change it to any preferred name).
- Loaded via `dotenv` in `index.js` and used by `config/db.js`. The app exits with code 1 if the connection fails.

### Troubleshooting

- **SSL alert (internal error) / connection timeout**: your machine's IP is not in the Atlas allowlist. Add it under **Network Access** in the Atlas console.
- **`querySrv ECONNREFUSED`**: the machine's DNS resolver is misconfigured. `config/db.js` automatically falls back to public DNS (`8.8.8.8`, `1.1.1.1`) when the default resolver cannot resolve the cluster.
