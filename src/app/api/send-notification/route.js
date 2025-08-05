import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (error) {
    console.error("❌ Firebase Admin init error:", error);
  }
}

export async function POST(req) {
  try {
    const { token, title, body, imageUrl } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "FCM token is required" }, { status: 400 });
    }

    const message = {
      token,
      notification: {
        title: title || "Hello from Next.js API 🚀",
        body: body || "This push works even if app is closed!",
        imageUrl: imageUrl || undefined,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel", // match Flutter's channel id
          imageUrl: imageUrl || undefined,
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: {
              title: title || "Hello from Next.js API 🚀",
              body: body || "This push works even if app is closed!",
            },
            sound: "default",
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, response });
  } catch (err) {
    console.error("❌ Notification send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
