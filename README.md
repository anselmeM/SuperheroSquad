# Superhero Search App

A dynamic web application for superhero enthusiasts to search, filter, and compare superheroes from across the multiverse.

![Superhero Search App](https://i.imgur.com/UlJCFjO.png)

## 🚀 Features

- **Powerful Search**: Instantly search for superheroes with real-time suggestions
- **Advanced Filtering**: Filter heroes by publisher, alignment, gender, and power stats
- **Favorites System**: Save your favorite heroes for quick access
- **Hero Comparison**: Compare multiple heroes side by side with visual stat comparisons
- **Shareable Searches**: Share specific searches with friends via URL parameters
- **Responsive Design**: Fully responsive interface that works on desktop and mobile
- **Dark/Light Mode**: Toggle between dark and light themes based on preference

## 🛠️ Technology Stack

- **Frontend**:
  - React with hooks for state management
  - TypeScript for type safety
  - TanStack Query for data fetching and caching
  - Tailwind CSS for styling
  - shadcn/ui components for UI elements
  - Wouter for lightweight routing

- **Backend**:
  - Node.js with Express
  - In-memory caching system with TTL (Time To Live)
  - WebSockets for real-time updates to cache statistics

- **Key Libraries**:
  - Zod for schema validation
  - Lucide React for icons
  - React Query for data fetching
  - Custom hooks for shared functionality

## 📸 Screenshots

### Home Page & Search Results
![Home Page](https://i.imgur.com/UlJCFjO.png)

### Hero Details Page
![Hero Details](https://i.imgur.com/a9FVfpv.png)

### Compare Heroes
![Compare Heroes](https://i.imgur.com/HWrRxpz.png)

### Favorites Page
![Favorites](https://i.imgur.com/QLMmQj8.png)

## 🎨 Design Choices

- **Color Scheme**: A vibrant primary color creates energy while maintaining readability and accessibility
- **Typography**:
  - "Bangers" font for headers provides a comic book feel
  - "Major Mono Display" for power stats and technical elements
  - "Lato" for readable text elements
  - "Montserrat" as the base font for overall consistency

- **Card-Based UI**: Information is presented in cards with hover effects for clear visual hierarchy
- **Micro-interactions**: Subtle animations on hover and click provide feedback without being distracting
- **Filter Badges**: Visual representation of active filters for immediate user feedback
- **Responsive Layout**: Adapts to different screen sizes without sacrificing functionality

## 💻 Installation & Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/superhero-search-app.git
   cd superhero-search-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5000`

## 🔌 API

The application uses the SuperHero API to fetch hero data. The backend includes:

- Caching layer to improve performance
- Search endpoint with filtering capabilities
- Hero details endpoint
- Stats endpoint for cache performance monitoring

## 📊 Performance Features

- **Server-side caching**: Reduces API calls and improves response times
- **Client-side state management**: Efficient updates without unnecessary re-renders
- **Debounced search**: Prevents excessive API calls during typing
- **Optimized image loading**: Proper sizing and loading of superhero images

## 🔄 Future Enhancements

- Social sharing capabilities
- User accounts to save preferences across devices
- More advanced comparison tools
- Team builder functionality
- PWA support for offline access

## 👨‍💻 Development

- **Code organization**: Feature-based structure for easy navigation
- **Custom hooks**: Encapsulated logic for favorites, comparison, and other features
- **TypeScript**: Used throughout for type safety and better developer experience
- **Component reusability**: Components designed to be reusable across the application

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.