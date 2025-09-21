# SpeculationAssist

A professional trading newsletter and market analysis platform built with Next.js, TypeScript, and Supabase.

## Features

- 📊 Market analysis and insights
- 📧 Newsletter subscription system
- 💼 Trading strategies and portfolio management
- 👥 Community-driven insights
- 🔐 User authentication with Supabase
- 📱 Responsive design with Tailwind CSS

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase
- **Icons:** Lucide React
- **Authentication:** Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd speculation-assist
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local` and update with your Supabase credentials
   - Get your Supabase URL and keys from your Supabase dashboard

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional: Custom logo from Supabase Storage
NEXT_PUBLIC_LOGO_URL=https://your-project-ref.supabase.co/storage/v1/object/public/assets/logo.png
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                # Utility functions and configurations
└── ...
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.