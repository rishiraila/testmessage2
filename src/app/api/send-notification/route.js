// src/app/api/send-notification/route.js
import { NextResponse } from "next/server";
import admin from "firebase-admin";

/* -------------------------
   FALLBACK Firebase creds (you already had these)
   ------------------------- */
const FALLBACK_PROJECT_ID = "testmessage-30914";
const FALLBACK_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@testmessage-30914.iam.gserviceaccount.com";
const FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3ZuFBxsNphziu\\n...snip...\\n-----END PRIVATE KEY-----\\n`;

/* -------------------------
   STATIC notification defaults — change these to whatever you want
   These are used when the incoming request does not provide title/body/imageUrl
   ------------------------- */
const STATIC_TITLE = "📢 Special Update!";
const STATIC_BODY = "We have an update for you — open the app to learn more.";
const STATIC_IMAGE_URL = "https://your-domain.com/static/offer-banner.jpg"; // <-- change me

/* -------------------------
   Firebase Admin init (uses env vars if present, otherwise fallback)
   ------------------------- */
function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Firebase Admin init error:", err);
    throw err;
  }
}

/**
 * POST body supported:
 * {
 *   token: "device_token"            // single device
 *   tokens: ["t1","t2"... ]         // multiple devices
 *   topic: "allUsers"               // topic
 *   title: "Optional title"
 *   body: "Optional body"
 *   imageUrl: "Optional image url"
 * }
 */
export async function POST(req) {
  try {
    initFirebaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Firebase init failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }

  try {
    const payload = await req.json();
    const { token, tokens, topic, title, body: messageBody, imageUrl } = payload || {};

    if (!token && !(tokens && tokens.length) && !topic) {
      return NextResponse.json({ success: false, error: "Provide token OR tokens[] OR topic" }, { status: 400 });
    }

    // Use provided values or fall back to static backend defaults
    const finalTitle = title || STATIC_TITLE;
    const finalBody = messageBody || STATIC_BODY;
    const finalImage = imageUrl || STATIC_IMAGE_URL;

    // Build notification object using canonical `image` field
    const notification = {
      title: finalTitle,
      body: finalBody,
      image: finalImage, // canonical name
    };

    // Always include data.image for background handlers / reliability
    const data = {
      image: finalImage,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    };

    // Platform-specific overrides
    const androidPayload = {
      priority: "high",
      notification: {
        channelId: "high_importance_channel",
        image: finalImage,
        defaultSound: true,
      },
    };

    const apnsPayload = {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          alert: { title: finalTitle, body: finalBody },
          sound: "default",
          "mutable-content": 1, // iOS: allow media processing
        },
      },
      fcm_options: {
        image: finalImage,
      },
    };

    const webpushPayload = {
      headers: { Urgency: "high" },
      fcm_options: {
        image: finalImage,
      },
    };

    // Send to topic
    if (topic) {
      const message = {
        topic,
        notification,
        data,
        android: androidPayload,
        apns: apnsPayload,
        webpush: webpushPayload,
      };
      const resp = await admin.messaging().send(message);
      return NextResponse.json({ success: true, sent: "topic", response: resp });
    }

    // Send to multiple tokens (multicast)
    if (tokens && tokens.length) {
      const multicastMessage = {
        tokens,
        notification,
        data,
        android: androidPayload,
        apns: apnsPayload,
        webpush: webpushPayload,
      };
      const resp = await admin.messaging().sendMulticast(multicastMessage);
      return NextResponse.json({ success: true, sent: "multicast", response: resp });
    }

    // Single token send
    const message = {
      token,
      notification,
      data,
      android: androidPayload,
      apns: apnsPayload,
      webpush: webpushPayload,
    };

    const response = await admin.messaging().send(message);
    console.log("📤 Notification sent:", response);
    return NextResponse.json({ success: true, sent: "single", response });
  } catch (err) {
    console.error("❌ Notification send error:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
