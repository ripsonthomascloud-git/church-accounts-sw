# Church Accounting Software

A modern church accounting software built with React, Firebase, and Tailwind CSS. Manage church members, income and expense categories, and track all your financial transactions in one place.

## Features

- **Authentication**: Secure login and signup with Firebase Authentication
- **Members Management**: Add, view, edit, and delete church members with CSV import support
- **Category Management**: Organize income and expense categories with pre-defined church-specific categories
- **Default Categories**: One-click initialization of 32 church-specific income and expense categories
- **Transaction Tracking**: Record and monitor income and expenses with yearly filtering
- **Dashboard**: View summary statistics and recent transactions by year
- **Real-time Data**: Powered by Firebase Firestore for instant updates
- **Protected Routes**: All application routes require authentication

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Firebase Firestore
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account with a project set up

## Installation

1. Clone the repository or navigate to the project directory

2. Install dependencies:
```bash
npm install
```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Firestore Database:
   - Go to Firestore Database in the left sidebar
   - Click "Create database"
   - Choose "Start in production mode" (or test mode for development)
   - Select a location for your database

4. Enable Authentication:
   - Go to Authentication in the left sidebar
   - Click "Get started"
   - Go to "Sign-in method" tab
   - Enable "Email/Password" authentication
   - Click "Save"

5. Get your Firebase configuration:
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click the web icon (</>)
   - Register your app and copy the configuration

5. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

6. Add your Firebase credentials to the `.env` file:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Members/        # Member-related components
│   ├── Categories/     # Category-related components
│   ├── Transactions/   # Transaction-related components
│   ├── Layout/         # Layout components (Navbar, Sidebar)
│   └── common/         # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # Firebase service configuration
├── App.jsx            # Main application component
└── main.jsx           # Application entry point
```

## Usage

### Authentication
- First-time users need to sign up at `/signup`
- Create an account with email and password (minimum 6 characters)
- Existing users can log in at `/login`
- All routes are protected - you must be logged in to access the application
- Click "Logout" in the navbar to sign out

### Members
- Navigate to the Members page to add new members
- View all members with their contact information and status
- Edit or delete existing members
- Import members from CSV file:
  - Click "Import from CSV" button
  - Select a CSV file with columns: firstname, lastname, address, phone, email, status
  - See `sample-members.csv` in the project root for format example
  - Preview data before importing

### Categories
- Go to the Categories page to manage income and expense categories
- **Initialize Default Categories**: Click "Initialize Default Categories" button to automatically create church-specific income and expense categories
  - **Income Categories**: Tithes, Offerings, Special Offerings, Building Fund, Mission Fund, Events Income, Fundraising, Rental Income, Book Sales, Grants, Interest Income, and Other Income
  - **Expense Categories**: Staff Salaries, Utilities, Rent/Mortgage, Maintenance, Office Supplies, Communications, Transportation, Ministry Expenses, Mission Support, Worship & Music, Youth Ministry, Children Ministry, Outreach & Evangelism, Benevolence, Insurance, Professional Services, Equipment & Technology, Printing, Events, and Other Expenses
- Switch between Income and Expense tabs
- Create custom categories to organize your transactions
- Edit or delete existing categories

### Transactions
- Visit the Transactions page to record income and expenses
- Select appropriate categories for each transaction
- Filter transactions by category
- View total amounts for income and expenses

### Dashboard
- The Dashboard provides an overview of your financial status
- View total income, expenses, and net balance
- See recent transactions at a glance

## Firebase Collections

The application uses the following Firestore collections:

- `members`: Store church member information (firstName, lastName, address, phone, email, status)
- `incomeCategories`: Income category definitions (name, description, createdAt)
- `expenseCategories`: Expense category definitions (name, description, createdAt)
- `income`: Income transactions (amount, category, date, description, memberId)
- `expenses`: Expense transactions (amount, category, date, description, memberId)

### Initializing Categories

The application includes pre-defined church-specific categories that can be automatically created:
- Click "Initialize Default Categories" on the Categories page
- 12 Income categories and 20 Expense categories will be created
- Existing categories won't be duplicated
- You can add, edit, or delete categories as needed

## Security

- Never commit your `.env` file to version control
- Keep your Firebase credentials secure
- Configure Firestore security rules in the Firebase Console

## License

MIT
