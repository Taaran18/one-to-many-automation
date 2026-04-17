"use client";

import { useState } from "react";

// ── Doc content ───────────────────────────────────────────────────────────────

const DOCS = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "Understand what each metric and section on your dashboard means.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    color: "from-indigo-500 to-violet-600",
    faqs: [
      { q: "Why are my campaign numbers not updating?", a: "Dashboard stats refresh every time you load the page. Hard-refresh (Ctrl+Shift+R) to see the latest numbers." },
      { q: "What does the message chart show?", a: "It shows total messages sent per day across all channels for the last 7 days." },
      { q: "Can I customise the dashboard?", a: "Not yet — customisable widgets are on the roadmap." },
    ],
    content: [
      {
        heading: "What is the Dashboard?",
        body: "The Dashboard is your command centre. It gives you a real-time snapshot of how your campaigns and messages are performing across WhatsApp and Email.",
      },
      {
        heading: "Total Messages Sent",
        body: "Shows the total number of messages sent across all campaigns. This includes both WhatsApp and Email messages.",
      },
      {
        heading: "Active Campaigns",
        body: "The number of campaigns currently running or scheduled. Click on any campaign to see its detailed status and message logs.",
      },
      {
        heading: "Total Leads",
        body: "The total number of leads you have added to the platform. Leads are the contacts you send messages to.",
      },
      {
        heading: "Recent Activity",
        body: "A timeline of your most recent campaign runs, messages sent, and any errors. Use this to quickly spot issues.",
      },
      {
        heading: "Message Chart",
        body: "A visual chart showing your message volume over the last 7 or 30 days. Useful for tracking growth and spotting drop-offs.",
      },
    ],
  },
  {
    id: "mail",
    title: "How to Connect Mail",
    description: "Step-by-step guide to connecting Gmail, Outlook, Yahoo, Zoho or a custom SMTP.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-600",
    faqs: [
      { q: "Why is my Gmail connection failing?", a: "Make sure you are using an App Password and not your main Gmail password. App Passwords are generated in Google Account → Security → 2-Step Verification → App passwords." },
      { q: "Can I connect a work or school Gmail?", a: "Yes. Use the 'Connect Gmail with Google' button — it works for personal Gmail, Google Workspace, school, and work accounts." },
      { q: "Will my email session survive a server restart?", a: "Yes. Email sessions are saved and automatically restored when the server restarts." },
      { q: "Can I connect multiple email accounts?", a: "Currently one email account per user is supported." },
    ],
    content: [
      {
        heading: "Step 1 — Open the Email modal",
        body: "Click the Email status button at the bottom of the left sidebar. If not connected, it will show in red. Click it to open the Email Account modal.",
      },
      {
        heading: "Step 2 — Choose your provider",
        body: "Select one of the providers: Gmail, Outlook / Hotmail, Yahoo Mail, Zoho Mail, or Custom SMTP. The form will adjust based on your selection.",
      },
      {
        heading: "Gmail — Option 1: Sign in with Google (Recommended)",
        body: "Click the 'Connect Gmail with Google' button. You will be redirected to Google to authorise access. This works for personal Gmail, Google Workspace, school, and work accounts. No password needed.",
      },
      {
        heading: "Gmail — Option 2: App Password",
        body: "Go to your Google Account → Security → 2-Step Verification → App passwords. Generate a password for 'Mail', copy it, and paste it in the App Password field along with your Gmail address. Click Connect Email.",
      },
      {
        heading: "Outlook / Hotmail",
        body: "Enter your Outlook email address and your regular Outlook password. If you have 2FA enabled, go to Microsoft Account → Security → Advanced security options → App passwords and generate one.",
      },
      {
        heading: "Yahoo Mail",
        body: "Go to Yahoo Account Security settings and generate an App Password. Enter your Yahoo email and the app password in the form. Click Connect Email.",
      },
      {
        heading: "Zoho Mail",
        body: "Enter your Zoho email and password. If you use 2FA, generate an app-specific password from Zoho Account Security settings.",
      },
      {
        heading: "Custom SMTP",
        body: "Enter your email address, password, SMTP host (e.g. smtp.example.com), and port (usually 587). Click Connect Email. Use this for any email provider not listed above.",
      },
      {
        heading: "After connecting",
        body: "The Email status button in the sidebar will turn green showing your connected email address. You can now send email campaigns and compose direct emails from the Mail page.",
      },
      {
        heading: "How to disconnect",
        body: "Click the green Email status button in the sidebar. In the modal, click Disconnect. Your email credentials are removed immediately.",
      },
    ],
  },
  {
    id: "whatsapp",
    title: "How to Connect WhatsApp",
    description: "Connect via QR code scan or the official Meta Business API.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: "from-green-500 to-emerald-600",
    faqs: [
      { q: "Do I need to scan the QR code every time?", a: "No. The session is saved on the server and persists across page refreshes. You only need to scan again if the server restarts or you unlink the device from your phone." },
      { q: "What is the difference between QR and Meta API?", a: "QR links your personal WhatsApp number. Meta API uses an official business number registered through Meta Business Manager and supports higher message volumes." },
      { q: "Can I send to people who haven't messaged me first?", a: "With QR mode, unsolicited messages may get your number flagged. With Meta API, you must use pre-approved templates for first-contact messages." },
      { q: "Why is my QR code not appearing?", a: "The server may still be generating the session. Wait 5–10 seconds and refresh. If it still doesn't appear, try disconnecting and reconnecting." },
    ],
    content: [
      {
        heading: "Two ways to connect WhatsApp",
        body: "You can connect via QR Code (links your personal WhatsApp number) or via the Meta Business API (official business number). QR is faster to set up; Meta API is required for high-volume sending.",
      },
      {
        heading: "QR Code — Step 1: Open the WhatsApp modal",
        body: "Click the WhatsApp status button at the bottom of the sidebar. If not connected, it shows in red. Click it to open the modal and select the QR Code tab.",
      },
      {
        heading: "QR Code — Step 2: Scan the QR code",
        body: "A QR code will appear on screen. Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan the QR code. Your phone must have an active internet connection.",
      },
      {
        heading: "QR Code — Step 3: Wait for connection",
        body: "After scanning, the status button in the sidebar will turn green within a few seconds. You are now connected and can send WhatsApp messages.",
      },
      {
        heading: "QR Code — Session persistence",
        body: "Your WhatsApp session is saved on the server. You do not need to scan the QR code again after a page refresh. However, if the server restarts or you log out on your phone, you will need to scan again.",
      },
      {
        heading: "Meta Business API — Requirements",
        body: "You need a Meta Business Manager account, a verified business phone number, and a WhatsApp Business API app. This is the official API for sending at scale.",
      },
      {
        heading: "Meta Business API — Step 1: Get your credentials",
        body: "In Meta Business Manager, go to WhatsApp → API Setup. Copy your Phone Number ID, WhatsApp Business Account ID, and generate a permanent System User Access Token.",
      },
      {
        heading: "Meta Business API — Step 2: Enter credentials",
        body: "In the WhatsApp modal, select the Meta Business API tab. Enter your Phone Number ID, Access Token, and WABA ID. Click Connect.",
      },
      {
        heading: "Meta Business API — Templates",
        body: "With Meta API, you must use pre-approved message templates for outbound messages. Create templates in the Templates page and submit them to Meta for approval before using them in campaigns.",
      },
      {
        heading: "How to disconnect WhatsApp",
        body: "Click the green WhatsApp status button in the sidebar and click Disconnect. For QR mode, this will also unlink the device from your phone.",
      },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Create, schedule, and track bulk WhatsApp and Email campaigns.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    color: "from-orange-500 to-amber-600",
    faqs: [
      { q: "Can I send to a subset of my leads?", a: "Yes. When creating a campaign you can filter leads by tag or group, or upload a fresh CSV for just that campaign." },
      { q: "What happens if a message fails to send?", a: "Failed messages are logged in the campaign report. You can retry failed recipients from the campaign detail page." },
      { q: "Can I schedule a campaign for later?", a: "Yes. Set a scheduled date and time when creating the campaign and it will run automatically at that time." },
      { q: "Can I pause a running campaign?", a: "You can stop a campaign mid-run. Messages already sent will not be recalled." },
    ],
    content: [
      {
        heading: "What is a Campaign?",
        body: "A Campaign is a bulk message send to a list of leads. You choose a channel (WhatsApp or Email), pick a template, select your audience, and send — either immediately or on a schedule.",
      },
      {
        heading: "Step 1 — Go to Campaigns",
        body: "Click Campaigns in the left sidebar. You will see a list of all past and active campaigns. Click 'New Campaign' to create one.",
      },
      {
        heading: "Step 2 — Choose a channel",
        body: "Select WhatsApp or Email. Make sure the corresponding account is connected before running a campaign — check the status buttons at the bottom of the sidebar.",
      },
      {
        heading: "Step 3 — Pick a template",
        body: "Select a message template. For WhatsApp Meta API campaigns, only pre-approved templates can be used. For QR-mode or Email, any saved template works.",
      },
      {
        heading: "Step 4 — Select your audience",
        body: "Choose which leads to target. You can select all leads, filter by tag, or upload a new CSV file. The recipient count is shown before you send.",
      },
      {
        heading: "Step 5 — Schedule or send now",
        body: "Choose 'Send now' to start immediately, or pick a date and time to schedule. Scheduled campaigns run automatically — you don't need to be logged in.",
      },
      {
        heading: "Viewing campaign results",
        body: "Click any campaign to see its report: total sent, delivered, failed, and a per-recipient message log. Use this to identify failed numbers or emails.",
      },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    description: "Import, organise, and manage your contact list.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-600",
    faqs: [
      { q: "What columns does the CSV need?", a: "At minimum: a 'phone' column (with country code, e.g. 919876543210) for WhatsApp or an 'email' column for Email. A 'name' column is optional but recommended for personalisation." },
      { q: "Can I have duplicate leads?", a: "The platform deduplicates by phone number or email on import. Duplicates are skipped with a warning." },
      { q: "Can I delete all leads at once?", a: "Yes. Use the Select All checkbox and then the Delete button. This action is permanent." },
      { q: "How do I use lead names in messages?", a: "In your template body use {{name}} as a placeholder. It will be replaced with each lead's name when the campaign runs." },
    ],
    content: [
      {
        heading: "What are Leads?",
        body: "Leads are the contacts you send messages to. Every campaign targets a set of leads. You can add leads manually or import them in bulk via CSV.",
      },
      {
        heading: "Adding leads manually",
        body: "Click 'Add Lead' on the Leads page. Enter the name, phone number (with country code), and email address. Click Save.",
      },
      {
        heading: "Importing via CSV",
        body: "Click 'Import CSV'. Download the sample template if needed. Your CSV should have at minimum a 'phone' column (for WhatsApp) or 'email' column (for Email). A 'name' column is optional but enables personalisation.",
      },
      {
        heading: "Phone number format",
        body: "Phone numbers must include the country code without the + sign. For India: 919876543210. For US: 12025551234. Numbers with incorrect formats will be skipped.",
      },
      {
        heading: "Searching and filtering",
        body: "Use the search bar to find leads by name, phone, or email. You can also sort and filter the table to organise large lists.",
      },
      {
        heading: "Editing and deleting leads",
        body: "Click on any lead row to edit their details. To delete, select the lead(s) using the checkbox and click Delete. Deleted leads cannot be recovered.",
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    description: "Create and manage reusable message templates for WhatsApp and Email.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "from-purple-500 to-pink-600",
    faqs: [
      { q: "Do WhatsApp templates need approval?", a: "Only if you are using the Meta Business API. QR-mode templates are used directly without approval. Meta API templates must be submitted and approved — this can take 24–48 hours." },
      { q: "Can I use variables in templates?", a: "Yes. Use {{name}}, {{1}}, {{2}}, etc. as placeholders. They are replaced with lead data when the campaign runs." },
      { q: "Can I use the same template for WhatsApp and Email?", a: "Templates are channel-specific. A WhatsApp template and an Email template are stored separately." },
      { q: "Can I include images or files in templates?", a: "For WhatsApp Meta API you can attach a header image or document. For Email, you can use HTML in the body including images via URL." },
    ],
    content: [
      {
        heading: "What are Templates?",
        body: "Templates are pre-written messages you save once and reuse across multiple campaigns. They save time and ensure consistency in your messaging.",
      },
      {
        heading: "Creating a WhatsApp Template",
        body: "Go to Templates and click 'Create WA Template'. Give it a name, write the message body. Use {{name}} or {{1}} for variable placeholders. Click Save.",
      },
      {
        heading: "Creating an Email Template",
        body: "Go to Templates and click 'Create Email Template'. Enter a subject line and write the body — plain text or HTML is supported. Use {{name}} for personalisation. Click Save.",
      },
      {
        heading: "Meta API Template Approval",
        body: "If you use the Meta Business API, WhatsApp templates must be submitted to Meta for approval. After saving, the template status will show as 'Pending'. Approved templates show as 'Active'. This takes 24–48 hours.",
      },
      {
        heading: "Using variables",
        body: "Add {{name}} anywhere in the body and it will be replaced with each lead's name when the campaign sends. You can also use numbered variables {{1}}, {{2}} for Meta API templates.",
      },
      {
        heading: "Editing and deleting templates",
        body: "Click the Edit icon on any template to update it. Deleting a template does not affect campaigns that have already run, but it will be unavailable for future campaigns.",
      },
    ],
  },
  {
    id: "chats",
    title: "Chats",
    description: "View and reply to incoming WhatsApp messages in real time.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    color: "from-sky-500 to-blue-600",
    faqs: [
      { q: "Do I get notified of new messages?", a: "A red badge with the unread count appears on the Chats item in the sidebar, updating every 10 seconds." },
      { q: "Can I reply from the Chats page?", a: "Yes. Click any conversation to open it and type your reply in the text box at the bottom." },
      { q: "Does Chats work with Meta API?", a: "Chats only works with QR-mode connections. Meta API replies are handled via webhooks outside the platform." },
      { q: "Are messages stored?", a: "Messages are stored on the server and visible as long as your WhatsApp session is active." },
    ],
    content: [
      {
        heading: "What is the Chats page?",
        body: "The Chats page shows all incoming WhatsApp conversations from people who have replied to your campaigns or messaged your number directly.",
      },
      {
        heading: "Viewing conversations",
        body: "Click Chats in the sidebar. All conversations are listed on the left. Click any conversation to open the full message thread on the right.",
      },
      {
        heading: "Replying to a message",
        body: "With a conversation open, type your reply in the text box at the bottom and press Enter or click Send. The message is sent instantly via your connected WhatsApp.",
      },
      {
        heading: "Unread badge",
        body: "A green badge showing the unread message count appears next to Chats in the sidebar. It updates automatically every 10 seconds.",
      },
      {
        heading: "Requirements",
        body: "Chats requires your WhatsApp to be connected via QR code. Make sure the WhatsApp status button in the sidebar shows green before expecting incoming messages.",
      },
    ],
  },
  {
    id: "mail-page",
    title: "Mail",
    description: "Compose and send individual emails directly from the platform.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-rose-500 to-pink-600",
    faqs: [
      { q: "Is there a send limit?", a: "Limits depend on your email provider. Gmail allows ~500 emails/day for personal accounts and more for Google Workspace. The platform does not impose its own limit." },
      { q: "Can I send to multiple recipients?", a: "The Mail page is for composing individual emails. For bulk sending to many contacts, use a Campaign instead." },
      { q: "Can I use HTML in the email body?", a: "Yes. You can write or paste HTML in the body field. Plain text is also supported." },
      { q: "Will replies come back to me?", a: "Yes. Replies go directly to your connected email address, not to the platform." },
    ],
    content: [
      {
        heading: "What is the Mail page?",
        body: "The Mail page lets you compose and send individual emails directly from the platform using your connected email account.",
      },
      {
        heading: "Requirement: Connect your email first",
        body: "Before using the Mail page, connect your email account via the Email status button at the bottom of the sidebar. The button must be green.",
      },
      {
        heading: "Composing an email",
        body: "Go to Mail in the sidebar. Enter the recipient's email address in the 'To' field, write a subject line, and type your message in the body.",
      },
      {
        heading: "Using HTML",
        body: "You can write HTML directly in the body field for formatted emails with links, bold text, colours, and images (via URLs). Plain text also works.",
      },
      {
        heading: "Sending",
        body: "Click Send. The email is dispatched immediately through your connected email account. The sender name shown to the recipient is your display name or email address.",
      },
      {
        heading: "Bulk sending",
        body: "The Mail page is for one-off emails. To send the same message to hundreds of contacts, create a Campaign with an Email template instead.",
      },
    ],
  },
  {
    id: "account-settings",
    title: "Account Settings",
    description: "Update your name, email, and password from the account modal.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "from-slate-500 to-gray-600",
    faqs: [
      { q: "Can I change my login email?", a: "Yes. Open Account Settings from the sidebar bottom-left, update the email field, and save. You will need to use the new email to log in next time." },
      { q: "I signed up with Google — can I set a password?", a: "Currently Google-login accounts do not support password login. You must continue using Google to sign in." },
      { q: "How do I delete my account?", a: "Email taaranjain16@gmail.com with your account email and we will delete your account and all associated data." },
      { q: "Is my password stored securely?", a: "Passwords are hashed with bcrypt and never stored in plain text. We never have access to your actual password." },
    ],
    content: [
      {
        heading: "Opening Account Settings",
        body: "Click your name or avatar at the bottom-left of the sidebar. This opens the Account modal where you can update your profile.",
      },
      {
        heading: "Changing your display name",
        body: "In the Account modal, edit the Full Name field and click Save Changes. Your updated name will appear in the sidebar immediately.",
      },
      {
        heading: "Changing your email",
        body: "Update the Email field in the Account modal and click Save Changes. Use the new email address to log in from your next session.",
      },
      {
        heading: "Changing your password",
        body: "Enter your current password, then your new password, and confirm it. Click Save Changes. If you forget your current password, use the Forgot Password flow on the login page.",
      },
      {
        heading: "Logging out",
        body: "Click the logout icon (arrow pointing right) next to your avatar at the bottom of the sidebar. You will be redirected to the login page.",
      },
      {
        heading: "Deleting your account",
        body: "Account deletion is handled manually. Email taaranjain16@gmail.com from your registered address requesting deletion. All your data will be removed within 7 days.",
      },
    ],
  },
  {
    id: "theme-modes",
    title: "Theme Modes",
    description: "Switch between light and dark mode to match your preference.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    color: "from-yellow-500 to-orange-600",
    faqs: [
      { q: "Does the theme preference save between sessions?", a: "Yes. Your theme choice is saved in local storage and remembered the next time you open the app." },
      { q: "Does the theme affect emails or WhatsApp messages?", a: "No. The theme only changes the appearance of the platform UI. Messages sent to contacts are unaffected." },
      { q: "Is there a system/auto mode?", a: "Not yet. Auto mode that follows your OS setting is on the roadmap." },
    ],
    content: [
      {
        heading: "What is Dark Mode?",
        body: "Dark mode switches the platform's background to dark colours, reducing eye strain in low-light environments and saving battery on OLED screens.",
      },
      {
        heading: "How to toggle the theme",
        body: "Click the sun/moon icon in the bottom-left of the sidebar, next to your profile name. One click switches between light and dark mode.",
      },
      {
        heading: "Theme preference is saved",
        body: "Your theme choice is stored in your browser's local storage. It persists across page refreshes and browser restarts on the same device.",
      },
      {
        heading: "Light Mode",
        body: "The default theme. White backgrounds with dark text — ideal for bright environments and professional settings.",
      },
      {
        heading: "Dark Mode",
        body: "Dark backgrounds with light text — easier on the eyes at night or in dim conditions. All charts, cards, and modals adapt automatically.",
      },
    ],
  },
];

// ── Modal ─────────────────────────────────────────────────────────────────────

function DocModal({ doc, onClose }: { doc: typeof DOCS[0]; onClose: () => void }) {
  const [tab, setTab] = useState<"guide" | "faq">("guide");

  const hasGuide = doc.content && doc.content.length > 0;
  const hasFaq   = doc.faqs   && doc.faqs.length   > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`bg-gradient-to-r ${doc.color} px-6 py-5 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3 text-white">
            {doc.icon}
            <h2 className="text-lg font-bold">{doc.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Switcher */}
        {hasGuide && hasFaq && (
          <div className="flex justify-center pt-5 pb-1 shrink-0">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTab("guide")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === "guide"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                How-to Guide
              </button>
              <button
                onClick={() => setTab("faq")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === "faq"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                FAQ
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {tab === "guide" && doc.content.map((section, i) => (
            <div key={i} className="flex gap-4">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${doc.color} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.heading}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{section.body}</p>
              </div>
            </div>
          ))}

          {tab === "faq" && doc.faqs && doc.faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} color={doc.color} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQItem({ faq, color }: { faq: { q: string; a: string }; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span>{faq.q}</span>
        <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800">
          {faq.a}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [selected, setSelected] = useState<typeof DOCS[0] | null>(null);

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Documentation</h1>
      <p className="text-sm text-gray-400 dark:text-slate-500 mb-8">Click a card to learn how to use each feature.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCS.map((doc, i) => {
          const isOrphan = DOCS.length % 3 === 1 && i === DOCS.length - 1;
          return (
          <button
            key={doc.id}
            onClick={() => setSelected(doc)}
            className={`group text-left bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200${isOrphan ? " lg:col-start-2" : ""}`}
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${doc.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform`}>
              {doc.icon}
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{doc.title}</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">{doc.description}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-500">
              Read more
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          );
        })}
      </div>

      {selected && <DocModal doc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
