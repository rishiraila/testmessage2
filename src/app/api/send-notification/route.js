import { NextResponse } from "next/server";
import admin from "firebase-admin";

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials in env vars. " +
      "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  console.log("✅ Firebase Admin initialized");
}

export async function POST(req) {
  try {
    initFirebaseAdmin();
  } catch (err) {
    console.error("❌ Firebase Admin init error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { token, title, body: messageBody, imageUrl } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "FCM token is required" },
        { status: 400 }
      );
    }

    const message = {
      token,
      notification: {
        title: title || "Notification",
        body: messageBody || "",
        imageUrl: imageUrl || undefined,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          imageUrl: imageUrl || undefined,
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: {
              title: title || "Notification",
              body: messageBody || "",
            },
            sound: "default",
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("📤 Notification sent:", response);

    return NextResponse.json({ success: true, response });
  } catch (err) {
    console.error("❌ Notification send error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
