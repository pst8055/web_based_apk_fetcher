# WebADB APK Extractor

A modern, 100% client-side web application to extract APKs from Android devices directly in your browser.

![How it works](instructions.png)

## Features
*   **100% Client-Side**: Runs entirely in your browser (Chrome/Edge). No Python or Docker needed.
*   **Connect via ADB**: Uses WebUSB to connect to your Android device.
*   **List Apps**: Fetches a list of all 3rd-party installed applications.
*   **Download**: One-click download of the APK file to your computer.

## Prerequisites
*   **Browser**: Google Chrome, Microsoft Edge, or Opera (WebUSB support required).
*   **Android Device** with **USB Debugging enabled**:
    1. Go to **Settings** → **About Phone**
    2. Tap **Build Number** 7 times to enable Developer Options
    3. Go to **Settings** → **Developer Options**
    4. Enable **USB Debugging**
    5. Connect device via USB cable

## How to Run
1.  Start a local server (WebUSB requires localhost or HTTPS):
    ```bash
    python3 -m http.server
    ```
2.  Open `http://localhost:8000`.
