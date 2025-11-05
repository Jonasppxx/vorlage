# 🚀 Vorlage - Next.js Starter Template

Ein vollständiges Next.js Starter-Template mit TypeScript, Tailwind CSS und ESLint.

## ✨ Features

- ⚡ **Next.js 16** - Das neueste React Framework
- 🎨 **Tailwind CSS 4** - Utility-First CSS Framework
- 📘 **TypeScript** - Type-Safe Development
- 🔍 **ESLint** - Code Quality
- 🎯 **App Router** - Moderne Next.js Architektur
- 🚀 **Sofort einsatzbereit** - Keine weitere Konfiguration nötig

## 📦 Installation

### Option 1: Mit npx (Empfohlen)

```bash
npx @jonastest/vorlage mein-projekt
cd mein-projekt
npm run dev
```

### Option 2: Mit npm install

```bash
npm install -g @jonastest/vorlage
create-vorlage mein-projekt
cd mein-projekt
npm run dev
```

### Option 3: Als Template klonen

```bash
git clone https://github.com/Jonasppxx/vorlage.git mein-projekt
cd mein-projekt
npm install
npm run dev
```

## 🛠️ Verfügbare Scripts

```bash
npm run dev      # Startet Development Server (http://localhost:3000)
npm run build    # Erstellt Production Build
npm run start    # Startet Production Server
npm run lint     # Führt ESLint aus
```

## 📁 Projektstruktur

```
vorlage/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Hauptseite
│   ├── layout.tsx      # Root Layout
│   └── globals.css     # Globale Styles
├── public/             # Statische Dateien
├── next.config.ts      # Next.js Konfiguration
├── tailwind.config.ts  # Tailwind Konfiguration
├── tsconfig.json       # TypeScript Konfiguration
└── package.json        # Dependencies
```

## 🎨 Anpassung

Nach der Installation kannst du alles anpassen:

1. **Styles**: Bearbeite `app/globals.css` und `tailwind.config.ts`
2. **Pages**: Erstelle neue Seiten in `app/`
3. **Components**: Erstelle Komponenten wo du möchtest
4. **Configuration**: Passe `next.config.ts` an deine Bedürfnisse an

## 📝 Beispiel-Komponente erstellen

```tsx
// app/components/Button.tsx
export default function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      {children}
    </button>
  );
}
```

## 🌐 Deployment

### Vercel (Empfohlen)

```bash
npm install -g vercel
vercel
```

### Andere Plattformen

Folge den Anleitungen für [Netlify](https://nextjs.org/docs/deployment#netlify), [AWS](https://nextjs.org/docs/deployment#aws), oder [Docker](https://nextjs.org/docs/deployment#docker).

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle ein Issue oder Pull Request.

## 📄 Lizenz

MIT © [Jonasppxx](https://github.com/Jonasppxx)

## 🔗 Links

- [Dokumentation](https://github.com/Jonasppxx/vorlage)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

## 💡 Support

Bei Fragen oder Problemen, bitte erstelle ein [Issue](https://github.com/Jonasppxx/vorlage/issues).

---

Made with ❤️ by [Jonasppxx](https://github.com/Jonasppxx)
