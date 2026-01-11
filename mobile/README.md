# NexusHub Mobile App# Welcome to your Expo app 👋

A modern React Native mobile application built with Expo, following industry best practices.This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## 📁 Project Structure## Get started

````1. Install dependencies

mobile/

├── app/                          # Expo Router file-based routing   ```bash

│   ├── _layout.tsx               # Root layout with auth guard & providers   npm install

│   ├── index.tsx                 # Entry redirect   ```

│   ├── onboarding.tsx            # User onboarding flow

│   ├── verification-apply.tsx    # Creator verification2. Start the app

│   ├── (auth)/                   # Auth route group (unauthenticated)

│   │   ├── _layout.tsx           # Auth layout   ```bash

│   │   ├── login.tsx   npx expo start

│   │   ├── signup.tsx   ```

│   │   └── verify.tsx            # Email OTP verification

│   └── (tabs)/                   # Main app tabs (authenticated)In the output, you'll find options to open the app in a

│       ├── _layout.tsx           # Tab navigation layout

│       └── index.tsx             # Home/Dashboard screen- [development build](https://docs.expo.dev/develop/development-builds/introduction/)

├── components/                   # Reusable components- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)

│   ├── index.ts                  # Barrel exports- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)

│   ├── EmptyState.tsx            # Empty state displays- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

│   ├── LoadingScreen.tsx         # App loading screen

│   ├── SafeScreen.tsx            # Safe area wrapperYou can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

│   └── ui/                       # UI primitives

│       ├── index.ts## Get a fresh project

│       ├── Button.tsx

│       ├── Input.tsxWhen you're ready, run:

│       └── Loader.tsx

├── constants/                    # App constants```bash

│   └── index.ts                  # All constants (storage keys, colors, etc.)npm run reset-project

├── hooks/                        # Custom React hooks```

│   ├── index.ts                  # Barrel exports

│   ├── useAuthState.ts           # Auth state managementThis command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

│   └── useUser.ts                # User data hooks

├── lib/                          # Utilities & configs## Learn more

│   ├── api.ts                    # Axios instance & API helpers

│   ├── supabase.ts               # Supabase client configTo learn more about developing your project with Expo, look at the following resources:

│   └── utils.ts                  # Helper functions

├── types/                        # TypeScript types- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).

│   └── index.ts                  # All type definitions- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

└── assets/                       # Images, fonts, etc.

    └── images/## Join the community

````

Join our community of developers creating universal apps.

## 🚀 Tech Stack

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.

- **Framework**: [Expo](https://expo.dev) with [Expo Router](https://docs.expo.dev/router/introduction/)- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

- **Language**: TypeScript
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management**: [React Query](https://tanstack.com/query) (@tanstack/react-query)
- **Backend**: [Supabase](https://supabase.com) (Auth, Database, Storage)
- **HTTP Client**: Axios

## 🏃‍♂️ Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Fill in your Supabase and API credentials.

3. Start the development server:
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

## 📱 Key Features

- **Authentication Flow**: Email/password + Google OAuth with email verification
- **Onboarding**: User profile setup with avatar selection
- **Creator Verification**: Identity verification for creators
- **Type Safety**: Full TypeScript coverage with centralized types

## 🔧 Path Aliases

This project uses `@/*` path aliases for clean imports:

```typescript
// Instead of:
import { Button } from "../../components/ui/Button";

// Use:
import { Button } from "@/components/ui/Button";
```

## 📦 Importing

Use barrel exports for cleaner imports:

```typescript
// Components
import { Button, Input, Loader } from "@/components";
import { SafeScreen, EmptyState } from "@/components";

// Hooks
import { useAuthState, useUser } from "@/hooks";

// Types
import type { User, Creator, AuthState } from "@/types";

// Constants
import { AVATARS, STORAGE_KEYS, COLORS } from "@/constants";

// Utils
import { formatDate, capitalizeFirstLetter } from "@/lib/utils";
```

## 🧪 Development

- Run linting: `npm run lint`
- Type check: `npx tsc --noEmit`
- Reset project: `npm run reset-project`

## 📚 Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Supabase](https://supabase.com/docs)
