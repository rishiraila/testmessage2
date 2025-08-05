import { NextResponse } from "next/server";
import admin from "firebase-admin";

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = "testmessage-30914";
  const clientEmail = "firebase-adminsdk-fbsvc@testmessage-30914.iam.gserviceaccount.com";
  const privateKey = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3ZuFBxsNphziu\\nmKqEOlKtAl5AhbkB+Qs26ErWQHOh77qsGrk/CFHr4YcYIteY/8BxFwM6mMa/whkR\\nyL48TE3zsQT5buFaXfig1W3E+gMQ+Ig22jLssnR915Ddiis1HQDGp35dQTmDB5Hb\\n8XPueAbZvXC5UT1aFhf54OtHbLZ8T96qXjRfuzvXE14DE0mcIODHNCHkzZssTI9l\\nrd1KnRLKZro9Uc/lW/AejSGwp9sk65hlpy8GdxG3N83EXG5pF56Y6ea9/rVk1Ngn\\nupD/dvCfZV4gDFL+1bjVbo7uwcGDjpe+HdCNfN3Sc8rhwHeKLAruHwQGP2vLHtVD\\nmkKcJhhpAgMBAAECggEAEOC+ZSO/aFmXMqDTvGnI9v6rTCvM5qy+cUtNASJFofGi\\nZQ6WiAGiLF+BDmG9I+mRZ7boR1RiTKkLo+fXSKGgYNykamIKX3BwyOMAqupz2B7P\\nG6Er+OgZXAViYbOX81eGcpcHxC7poIXUpgA2nOEIhwbt4JgPLy2uVNgelDWh0Oxk\\nKL45ovkCk3C5jcuNlEff4aE65VOYleCOngsQHmHr/i44ZOnvNyqJoEVY9MjNmzHO\\nPVjajf/7Xg5StkZshf6sthFdtUck/LXCKqV+VDVKGvlN8OsI/KO6KKYcJ7e9sqdo\\nCyBGrUBxu5FpHgBruOlERPDNMm/WRgbrWwL/YI+EuwKBgQDiusGWnO+aF26qPMwp\\nESeyHgUxVIe4VGZ0BH1CLJBJkc2e865y1B9luPi3UnMBF6nGyhYmeY2EKNpRpYlU\\nmw5FA3haJZ+5fUbZrOHDZR8Fro8CKf3LlV64T95HhQVA7BAQGwEJ3SG1tytXFyyE\\n5p1alXEJAvP+3COd1Zf3oH+13wKBgQDPFC1QNd4twmr7leYX6YDDPImhx/LWOUy6\\nV+owGxWFZRKXanMBOUJzDzz+udgFABagIVMbzIYARbtOzhCilYLSeW7QWOuVMrAp\\nUbWxsWwLjnqt2DQ2BzT+HVjIJT1bvSHs09WJ4GD48sa1K1NHU39NML3n+QOebnlx\\nOu5j7ouqtwKBgBI8QQuzDZZQIidxAl6fMZkizvobuVq69w6HuedTnDs+jdIl+Tbl\\nFq1gxihAal2BILeLU2K+zgH+IykD7lquqeQlFk3xzrnleIhTXkkP3gHf+0KKTA5O\\nsjKSwebwrO5+zf/tnBTGA0sRM1wq0frSbX92m4PFCAjMfdTY9AMHlp3zAoGAOXdE\\n9+xrAtHgNH8twlcHZ6bGHwJI7pAqLdA16jGp8EHTPffJgH5uZVXGPH5AZ2rV3IxC\\n7wT77tlrGHxw+114V4ZhbSov/lB5uI23WV9+N1rLyrCkFJY9a4OjXq+O7oV3A6zp\\npoCBCLT+1cn3K2UNf9NV8CkXiwDnbLfI7iyFz9MCgYEAlIvbbNz3YQNSlG5kJT+P\\nQ4vrLsiA2xrVsRVnG5swTRYnS68enLEhk0VNzoptuvaKEwMkKHApcVP8czIK/cg8\\nnTrR0eTLrEwvYDryGVyfeCJKTR0rKFU67fShvGylNlyUAy3IE3QPIoBJGZrVmalj\\nUQOUgmbWH1gEkHiIhUJUKl0=\\n-----END PRIVATE KEY-----\\n";

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
