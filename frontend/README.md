# EasyPrint - Frontend

Next.js frontend application for EasyPrint, a platform connecting students with local xerox shops.

## Getting Started

### Prerequisites

- Node.js 20+ installed
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Update .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Development

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── page.tsx        # Home page (file upload)
│   ├── order/          # Order details page
│   ├── orders/         # Orders list page
│   └── shop/           # Shop dashboard page
├── components/         # Reusable components
│   ├── FileUpload.tsx  # File upload component
│   └── ShopDashboard.tsx # Shop dashboard component
└── globals.css         # Global styles
```

## Features

- **File Upload**: Drag & drop or click to upload documents (PDF, DOCX, images)
- **Print Configuration**: Set copies, page range, color options, binding
- **Live Preview**: Preview uploaded documents before submission
- **Order Tracking**: Track order status and history
- **Shop Dashboard**: View and manage incoming orders (for shop owners)

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production, update with your deployed backend URL.

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **PDF.js**: PDF rendering and preview
- **Axios**: HTTP client for API calls
- **React Dropzone**: File upload handling

## Deployment

See the [DEPLOYMENT.md](../DEPLOYMENT.md) file in the root directory for comprehensive deployment instructions.

### Quick Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import repository in Vercel
3. Set root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=<your-backend-url>`
5. Deploy!

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
