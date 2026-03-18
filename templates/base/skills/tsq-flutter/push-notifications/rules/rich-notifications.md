---
title: Rich Notifications
impact: HIGH
impactDescription: "리치 알림 → 탭률 20-30% 향상, 이미지+액션 → 사용자 참여 증가"
tags: rich-notification, image, action-button, grouped, android, ios
---

## Rich Notifications

**Impact: HIGH (리치 알림 → 탭률 20-30% 향상, 이미지+액션 → 사용자 참여 증가)**

이미지 첨부, 액션 버튼, 그룹 알림, 커스텀 사운드. 플랫폼별 구현 차이.

### 이미지 알림

**Incorrect (이미지 URL 직접 전달 → 플랫폼별 미처리):**
```dart
await plugin.show(
  id, title, body,
  NotificationDetails(
    android: AndroidNotificationDetails('ch', 'Ch',
      // 이미지 없음 → 텍스트만 표시
    ),
  ),
);
```

**Correct (이미지 다운로드 + 플랫폼별 스타일):**
```dart
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:typed_data';

class RichNotificationService {
  final FlutterLocalNotificationsPlugin _plugin;

  RichNotificationService(this._plugin);

  /// 이미지 포함 알림 표시
  Future<void> showImageNotification({
    required int id,
    required String title,
    required String body,
    required String imageUrl,
    String? payload,
    String channelId = 'matches',
  }) async {
    // 이미지 다운로드
    final BigPictureStyleInformation? androidStyle =
        await _getAndroidBigPicture(imageUrl, title, body);
    final DarwinNotificationDetails? iosDetails =
        await _getIosAttachment(imageUrl);

    await _plugin.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          _channelName(channelId),
          importance: Importance.high,
          priority: Priority.high,
          styleInformation: androidStyle ??
              BigTextStyleInformation(body), // 이미지 실패 시 폴백
          largeIcon: androidStyle != null
              ? FilePathAndroidBitmap(
                  await _downloadToFile(imageUrl, 'large_icon'))
              : null,
        ),
        iOS: iosDetails ?? const DarwinNotificationDetails(),
      ),
      payload: payload,
    );
  }

  Future<BigPictureStyleInformation?> _getAndroidBigPicture(
    String imageUrl,
    String title,
    String body,
  ) async {
    try {
      final filePath = await _downloadToFile(imageUrl, 'big_picture');
      return BigPictureStyleInformation(
        FilePathAndroidBitmap(filePath),
        contentTitle: title,
        summaryText: body,
        hideExpandedLargeIcon: true,
      );
    } catch (e) {
      return null; // 이미지 실패 → 텍스트 폴백
    }
  }

  Future<DarwinNotificationDetails?> _getIosAttachment(
      String imageUrl) async {
    try {
      final filePath = await _downloadToFile(imageUrl, 'ios_attachment');
      return DarwinNotificationDetails(
        attachments: [DarwinNotificationAttachment(filePath)],
      );
    } catch (e) {
      return null;
    }
  }

  Future<String> _downloadToFile(String url, String prefix) async {
    final response = await http.get(Uri.parse(url));
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${prefix}_${url.hashCode}.jpg');
    await file.writeAsBytes(response.bodyBytes);
    return file.path;
  }

  String _channelName(String id) => switch (id) {
        'matches' => 'Match Alerts',
        'chat' => 'Chat Messages',
        _ => 'Notifications',
      };
}
```

### 액션 버튼

```dart
// === Android 액션 버튼 ===
Future<void> showNotificationWithActions({
  required int id,
  required String title,
  required String body,
  required String matchId,
}) async {
  await _plugin.show(
    id,
    title,
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        'matches',
        'Match Alerts',
        importance: Importance.high,
        actions: [
          const AndroidNotificationAction(
            'accept',       // actionId
            'Accept',       // 버튼 텍스트
            showsUserInterface: true,  // 앱을 포그라운드로
          ),
          const AndroidNotificationAction(
            'decline',
            'Decline',
            cancelNotification: true,  // 탭 시 알림 제거
          ),
          const AndroidNotificationAction(
            'reply',
            'Reply',
            inputs: [
              AndroidNotificationActionInput(
                label: 'Type a message...',
              ),
            ],
          ),
        ],
      ),
      // iOS: DarwinNotificationCategory에서 액션 정의 (초기화 시 등록)
      iOS: const DarwinNotificationDetails(
        categoryIdentifier: 'match_invite', // 초기화 시 등록한 카테고리
      ),
    ),
    payload: jsonEncode({'type': 'match', 'id': matchId}),
  );
}

// 액션 버튼 탭 핸들러
void _onNotificationTap(NotificationResponse response) {
  final actionId = response.actionId; // 'accept', 'decline', 'reply'

  switch (actionId) {
    case 'accept':
      final payload = _parsePayload(response.payload);
      _matchService.acceptInvite(payload['id']!);
      _router.push('/match/${payload['id']}');
    case 'decline':
      final payload = _parsePayload(response.payload);
      _matchService.declineInvite(payload['id']!);
    case 'reply':
      final input = response.input; // 사용자 입력 텍스트
      if (input != null) {
        final payload = _parsePayload(response.payload);
        _chatService.sendMessage(payload['id']!, input);
      }
    default:
      // 일반 탭 (액션 버튼이 아닌 알림 본문 탭)
      _navigateFromPayload(response.payload);
  }
}
```

### 그룹 알림 (Android)

```dart
/// Android 알림 그룹핑
Future<void> showGroupedNotifications({
  required List<ChatMessage> messages,
  required String chatId,
  required String chatName,
}) async {
  const groupKey = 'chat_messages';

  // 개별 알림
  for (int i = 0; i < messages.length; i++) {
    final msg = messages[i];
    await _plugin.show(
      msg.hashCode,
      chatName,
      '${msg.sender}: ${msg.text}',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'chat',
          'Chat Messages',
          groupKey: groupKey,
          // InboxStyle로 여러 줄 표시
          styleInformation: InboxStyleInformation(
            [msg.text],
            contentTitle: chatName,
          ),
        ),
      ),
      payload: jsonEncode({'type': 'chat', 'id': chatId}),
    );
  }

  // 요약 알림 (그룹 헤더)
  await _plugin.show(
    0, // 고정 ID — 요약 알림은 1개만
    chatName,
    '${messages.length} new messages',
    NotificationDetails(
      android: AndroidNotificationDetails(
        'chat',
        'Chat Messages',
        groupKey: groupKey,
        setAsGroupSummary: true, // 이것이 그룹 요약
        styleInformation: InboxStyleInformation(
          messages.map((m) => '${m.sender}: ${m.text}').toList(),
          contentTitle: '$chatName (${messages.length})',
          summaryText: '${messages.length} new messages',
        ),
      ),
    ),
  );
}
```

### 커스텀 사운드

```dart
// Android: res/raw/custom_sound.mp3 (확장자 제외)
// iOS: Runner/custom_sound.aiff (또는 .wav, .caf)

const androidDetails = AndroidNotificationDetails(
  'matches',
  'Match Alerts',
  sound: RawResourceAndroidNotificationSound('custom_sound'),
  playSound: true,
);

const iosDetails = DarwinNotificationDetails(
  sound: 'custom_sound.aiff',
  presentSound: true,
);
```

### 서버 발송 시 리치 알림 (FCM HTTP v1)

```json
{
  "message": {
    "token": "device_token",
    "notification": {
      "title": "New Match Invite",
      "body": "Join the Tennis match at 3 PM",
      "image": "https://example.com/match_banner.jpg"
    },
    "data": {
      "type": "match",
      "id": "match_123",
      "action": "invite"
    },
    "android": {
      "notification": {
        "channel_id": "matches",
        "image": "https://example.com/match_banner.jpg",
        "click_action": "FLUTTER_NOTIFICATION_CLICK"
      }
    },
    "apns": {
      "payload": {
        "aps": {
          "mutable-content": 1,
          "sound": "default"
        }
      },
      "fcm_options": {
        "image": "https://example.com/match_banner.jpg"
      }
    }
  }
}
```

### 규칙

- 이미지 → 다운로드 후 로컬 파일 경로 전달 (URL 직접 전달 X)
- 이미지 실패 → `BigTextStyleInformation` 텍스트 폴백 필수
- 액션 버튼 → Android: `AndroidNotificationAction`, iOS: `DarwinNotificationCategory`
- iOS 카테고리 → 초기화 시 등록 (`DarwinInitializationSettings.notificationCategories`)
- 그룹 알림 → `groupKey` 동일 + 요약 알림 `setAsGroupSummary: true`
- 커스텀 사운드 → Android: `res/raw/`, iOS: Runner 번들에 포함
- FCM 이미지 → `notification.image` (서버에서), `mutable-content: 1` (iOS 필수)
- 임시 파일 → `getTemporaryDirectory()` 사용, 주기적 정리 고려
