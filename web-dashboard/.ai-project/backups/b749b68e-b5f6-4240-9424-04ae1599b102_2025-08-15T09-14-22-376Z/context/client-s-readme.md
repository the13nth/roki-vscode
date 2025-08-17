---
id: 4caf7197-1fc7-4b00-bd8a-f845c03804bb
title: Client's readme
category: research
tags: 
---

# Kanda Assist

A comprehensive Flutter mobile application that provides vehicle insurance, roadside assistance, and automotive marketplace services.

## 🚗 Features

- **Vehicle Insurance**: Quick 3-minute insurance setup process
- **Roadside Assistance**: Get instant help when you need it
- **Claims Management**: File and track insurance claims
- **Marketplace**: Find trusted garages and quality spare parts
- **Parts Catalog**: Browse automotive parts including:
  - Air filters
  - Batteries
  - Brake pads
  - Headlights
  - Oil filters
  - Tire sets
- **Shopping Cart**: Manage your parts orders
- **Order Tracking**: Monitor your recent activities and orders
- **User Authentication**: Secure login and registration system

## 📱 Screenshots

The app includes multiple screens for a complete user experience:
- Splash Screen
- Onboarding
- Authentication (Login/Register)
- Home Dashboard
- Insurance Services
- Roadside Assistance
- Claims Management
- Marketplace & Parts
- Shopping Cart
- Orders & Recent Activity
- Settings

## 🛠️ Tech Stack

- **Framework**: Flutter
- **Language**: Dart
- **Platforms**: Android, iOS, Web, Desktop
- **State Management**: Provider pattern
- **UI Components**: Material Design 3

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (latest stable version)
- Dart SDK
- Android Studio / VS Code
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/maximemucyo/kanda-assist.git
   cd kanda-assist
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Run the app**
   ```bash
   flutter run
   ```

### Building for Production

- **Android APK**: `flutter build apk`
- **iOS**: `flutter build ios`
- **Web**: `flutter build web`

## 📁 Project Structure

```
lib/
├── main.dart                 # App entry point
├── screens/                  # UI screens
│   ├── auth/                # Authentication screens
│   ├── claims/              # Claims management
│   ├── home_screen.dart     # Main dashboard
│   ├── insurance_screen.dart
│   ├── marketplace_screen.dart
│   ├── roadside_screen.dart
│   └── ...
├── utils/                    # Utility classes
│   ├── app_theme.dart       # App theming
│   └── theme_provider.dart  # Theme state management
└── assets/                   # Images and resources
    └── parts/               # Automotive parts images
```

## 🔧 Configuration

The app uses Flutter's standard configuration files:
- `pubspec.yaml` - Dependencies and assets
- `analysis_options.yaml` - Code analysis rules
- Platform-specific configurations in `android/`, `ios/`, `web/`, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Maxime Mucyo**
- GitHub: [@maximemucyo](https://github.com/maximemucyo)

## 🙏 Acknowledgments

- Flutter team for the amazing framework
- Material Design team for the design system
- All contributors and supporters

---

**Kanda Assist** - Your trusted automotive companion 🚗✨
