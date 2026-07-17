# 🎭 BotPuppet

A beautiful, high-fidelity web control room designed to pull the strings of your Discord bot. **BotPuppet** allows you to break out of the terminal and jump into a modern dashboard where you can mimic your bot, orchestrate live chat, and send structured announcements.

---

## ✨ Features

* **🎭 Bot Identity Mimicry:** Drop right into the driver's seat of your bot profile. Read channels and type messages directly through its username.
* **📢 Advanced Announcement Builder:** A real-time visual creator for rich Discord Embeds, complete with custom thumbnails, hex color pickers, footers, and structural images.
* **⚡ Real-Time WebSockets:** Powered by Socket.io for instantaneous message handling, streaming updates, and state syncing.
* **🎨 High-Fidelity UI/UX:** A gorgeous dark-mode dashboard tailored with beautiful typography (`Sora`, `Inter`, `JetBrains Mono`) and responsive panels.

---

## 🔒 Absolute Privacy & Security

When it comes to Discord Bot Tokens, security is paramount. 
* **100% Local Processing:** This application runs entirely on your machine. 
* **Zero External Backends:** Your token is never uploaded, routed through, or saved to a third-party server or cloud database. 
* **Direct Handshake:** Your local Node.js engine initiates connections straight to the official Discord Gateway API.

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 16.x or higher recommended).

### 2. Installation
Clone this repository to your desktop and jump into the directory:
```
git clone https://github.com/skullvension/bot-puppet.git
cd bot-puppet

```

Install the required node modules:

```bash
npm install

```

### 3. Setting Up Environment Secrets

This repository includes a `.env.example` file to show you the template layout. To set up your environment:

1. Duplicate `.env.example` and rename the new file to exactly `.env`.
2. Open your new `.env` file and configure your local variables:

```env
PORT=3000
DISCORD_BOT_TOKEN=your_actual_discord_bot_token_here
```

*(Note: Your private Discord Bot Token should be entered directly through the secure dashboard interface on launch, keeping it out of configuration files entirely).*

### 4. Fire It Up

Launch your local backend service:

```bash
npm start

```

*or directly via node:*

```bash
node server.js

```

Now open your web browser and navigate to **`http://localhost:3000`** to access your control room!

---

## 📁 Repository Structure

```text
├── public/
│   ├── index.html      # The application UI dashboard Shell (With author credits)
│   └── style.css       # Custom CSS architecture (With author credits)
├── server.js           # Node.js backend managing WebSockets (With author credits)
├── .gitignore          # Keeps your local configurations & node_modules hidden
├── .env.example        # Example configuration template for local hosting
├── LICENSE             # MIT License protecting authorship
└── README.md           # This documentation file

```

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Feel free to open an issue or submit a pull request if you want to make BotPuppet even more powerful.

---

## 👤 Author

* **Skull Vension** - [GitHub Profile](https://github.com/skullvension)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
