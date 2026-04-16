# WishBuy Tracker

A modern, shared household wishlist and budget tracking application. Built to keep track of personal and shared expenses, monitor household budgets, and collaboratively rate wishes before purchasing.

## ✨ Features

* **Household Dashboard**: Real-time KPIs showing active wishes, total spent, and budget distribution (Shared vs. Personal).
* **Collaborative Voting**: Rate wishes (👍/👎) to agree on shared household purchases.
* **Categorization**: Organize items by custom categories (e.g., Tech, HIFI, Cars, Personal Care).
* **Seamless Authentication**: Built to run behind an Nginx Proxy Manager / Authelia setup via Header-based authentication.
* **Modern Tech Stack**: Blazing fast UI with Svelte 5 Runes and Tailwind CSS v4.

## 🛠️ Tech Stack

* **Frontend**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5) + [Tailwind CSS v4](https://tailwindcss.com/)
* **Backend**: Node.js via SvelteKit Server Routes
* **Database**: PostgreSQL
* **ORM**: [Prisma v7](https://www.prisma.io/) (with `@prisma/adapter-pg`)
* **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites
* Node.js (v20+ recommended)
* A running PostgreSQL database

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/hostrup/wishbuy.git](https://github.com/hostrup/wishbuy.git)
   cd wishbuy
Install dependencies:

Bash
npm install
Environment Setup:
Create a .env file in the root directory and add your PostgreSQL connection string:

Kodestykke
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
Initialize the Database:
Push the Prisma schema to your database to create the necessary tables, and generate the Prisma Client:

Bash
npx prisma db push
npx prisma generate
Start the Development Server:

Bash
npm run dev
The app will be available at http://localhost:5173.

🔐 Authentication Note
For local development, the app uses a fallback user (ronni_dev). In production, it expects an authentication header (e.g., remote-user) provided by a reverse proxy like Authelia.

📝 License
This project is for personal use.

