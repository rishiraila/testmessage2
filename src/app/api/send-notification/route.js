// src/app/api/send-notification/route.js
import { NextResponse } from "next/server";
import admin from "firebase-admin";

/* -------------------------
   FALLBACK Firebase creds (you already had these)
   ------------------------- */
const FALLBACK_PROJECT_ID = "testmessage-30914";
const FALLBACK_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@testmessage-30914.iam.gserviceaccount.com";
const FALLBACK_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3ZuFBxsNphziu\\nmKqEOlKtAl5AhbkB+Qs26ErWQHOh77qsGrk/CFHr4YcYIteY/8BxFwM6mMa/whkR\\nyL48TE3zsQT5buFaXfig1W3E+gMQ+Ig22jLssnR915Ddiis1HQDGp35dQTmDB5Hb\\n8XPueAbZvXC5UT1aFhf54OtHbLZ8T96qXjRfuzvXE14DE0mcIODHNCHkzZssTI9l\\nrd1KnRLKZro9Uc/lW/AejSGwp9sk65hlpy8GdxG3N83EXG5pF56Y6ea9/rVk1Ngn\\nupD/dvCfZV4gDFL+1bjVbo7uwcGDjpe+HdCNfN3Sc8rhwHeKLAruHwQGP2vLHtVD\\nmkKcJhhpAgMBAAECggEAEOC+ZSO/aFmXMqDTvGnI9v6rTCvM5qy+cUtNASJFofGi\\nZQ6WiAGiLF+BDmG9I+mRZ7boR1RiTKkLo+fXSKGgYNykamIKX3BwyOMAqupz2B7P\\nG6Er+OgZXAViYbOX81eGcpcHxC7poIXUpgA2nOEIhwbt4JgPLy2uVNgelDWh0Oxk\\nKL45ovkCk3C5jcuNlEff4aE65VOYleCOngsQHmHr/i44ZOnvNyqJoEVY9MjNmzHO\\nPVjajf/7Xg5StkZshf6sthFdtUck/LXCKqV+VDVKGvlN8OsI/KO6KKYcJ7e9sqdo\\nCyBGrUBxu5FpHgBruOlERPDNMm/WRgbrWwL/YI+EuwKBgQDiusGWnO+aF26qPMwp\\nESeyHgUxVIe4VGZ0BH1CLJBJkc2e865y1B9luPi3UnMBF6nGyhYmeY2EKNpRpYlU\\nmw5FA3haJZ+5fUbZrOHDZR8Fro8CKf3LlV64T95HhQVA7BAQGwEJ3SG1tytXFyyE\\n5p1alXEJAvP+3COd1Zf3oH+13wKBgQDPFC1QNd4twmr7leYX6YDDPImhx/LWOUy6\\nV+owGxWFZRKXanMBOUJzDzz+udgFABagIVMbzIYARbtOzhCilYLSeW7QWOuVMrAp\\nUbWxsWwLjnqt2DQ2BzT+HVjIJT1bvSHs09WJ4GD48sa1K1NHU39NML3n+QOebnlx\\nOu5j7ouqtwKBgBI8QQuzDZZQIidxAl6fMZkizvobuVq69w6HuedTnDs+jdIl+Tbl\\nFq1gxihAal2BILeLU2K+zgH+IykD7lquqeQlFk3xzrnleIhTXkkP3gHf+0KKTA5O\\nsjKSwebwrO5+zf/tnBTGA0sRM1wq0frSbX92m4PFCAjMfdTY9AMHlp3zAoGAOXdE\\n9+xrAtHgNH8twlcHZ6bGHwJI7pAqLdA16jGp8EHTPffJgH5uZVXGPH5AZ2rV3IxC\\n7wT77tlrGHxw+114V4ZhbSov/lB5uI23WV9+N1rLyrCkFJY9a4OjXq+O7oV3A6zp\\npoCBCLT+1cn3K2UNf9NV8CkXiwDnbLfI7iyFz9MCgYEAlIvbbNz3YQNSlG5kJT+P\\nQ4vrLsiA2xrVsRVnG5swTRYnS68enLEhk0VNzoptuvaKEwMkKHApcVP8czIK/cg8\\nnTrR0eTLrEwvYDryGVyfeCJKTR0rKFU67fShvGylNlyUAy3IE3QPIoBJGZrVmalj\\nUQOUgmbWH1gEkHiIhUJUKl0=\\n-----END PRIVATE KEY-----\\n";

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
