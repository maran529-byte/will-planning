/**
 * 微信公众号 XML 解析 / 构造
 *
 * 微信消息格式: XML over HTTP POST
 * 接收时解析为对象, 被动回复时构造为 XML
 */

// ============================================================================
// Types - 接收的消息
// ============================================================================

type EventType =
  | 'subscribe'         // 关注
  | 'unsubscribe'       // 取消关注
  | 'scan'              // 扫码 (已关注)
  | 'click'             // 菜单点击
  | 'view'              // 菜单跳转 (URL)
  | 'location'          // 上报位置
  | 'tpl_send_job_finish'; // 模板消息发送结果 (我们不用, 占位)

export type WeChatRecvMessage = {
  toUserName: string;       // 公众号 ID
  fromUserName: string;     // 用户 OpenID
  createTime: number;       // 时间戳 (秒)
  msgType: 'text' | 'image' | 'voice' | 'video' | 'location' | 'link' | 'event';
} & (
  | { msgType: 'text'; content: string; msgId: number }
  | { msgType: 'image'; picUrl: string; mediaId: string; msgId: number }
  | { msgType: 'voice'; mediaId: string; format: string; msgId: number; recognition?: string }
  | { msgType: 'video'; mediaId: string; thumbMediaId: string; msgId: number }
  | { msgType: 'location'; locationX: number; locationY: number; scale: number; label: string; msgId: number }
  | { msgType: 'link'; title: string; description: string; url: string; msgId: number }
  | {
      msgType: 'event';
      event: EventType;
      eventKey?: string;     // 菜单 key (CLICK), 扫码场景值 (SCAN)
      ticket?: string;       // 扫码 ticket
    }
);

// ============================================================================
// 解析
// ============================================================================

/**
 * 从 XML 字符串解析微信消息
 * 容错: 字段缺失返回空对象
 */
export function parseWeChatXml(xml: string): WeChatRecvMessage {
  const get = (tag: string): string => {
    const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return '';
    // 微信 XML 字段值在 <![CDATA[...]]> 内, 必须剥掉 CDATA 标记
    // 否则 m[1] 会包含字面 "<![CDATA[" / "]]>", 后续比较会全错
    return m[1]
      .replace(/^<!\[CDATA\[/, '')
      .replace(/\]\]>$/, '')
      .trim();
  };

  const msgType = get('MsgType') as WeChatRecvMessage['msgType'];
  const base = {
    toUserName: get('ToUserName'),
    fromUserName: get('FromUserName'),
    createTime: parseInt(get('CreateTime'), 10) || 0,
    msgType,
  };

  switch (msgType) {
    case 'text':
      return {
        ...base,
        content: get('Content'),
        msgId: parseInt(get('MsgId'), 10) || 0,
      } as WeChatRecvMessage;
    case 'image':
      return {
        ...base,
        picUrl: get('PicUrl'),
        mediaId: get('MediaId'),
        msgId: parseInt(get('MsgId'), 10) || 0,
      } as WeChatRecvMessage;
    case 'voice':
      return {
        ...base,
        mediaId: get('MediaId'),
        format: get('Format'),
        msgId: parseInt(get('MsgId'), 10) || 0,
        recognition: get('Recognition') || undefined,
      } as WeChatRecvMessage;
    case 'video':
      return {
        ...base,
        mediaId: get('MediaId'),
        thumbMediaId: get('ThumbMediaId'),
        msgId: parseInt(get('MsgId'), 10) || 0,
      } as WeChatRecvMessage;
    case 'location':
      return {
        ...base,
        locationX: parseFloat(get('Location_X')) || 0,
        locationY: parseFloat(get('Location_Y')) || 0,
        scale: parseInt(get('Scale'), 10) || 0,
        label: get('Label'),
        msgId: parseInt(get('MsgId'), 10) || 0,
      } as WeChatRecvMessage;
    case 'link':
      return {
        ...base,
        title: get('Title'),
        description: get('Description'),
        url: get('Url'),
        msgId: parseInt(get('MsgId'), 10) || 0,
      } as WeChatRecvMessage;
    case 'event':
      // 微信真实下发: <Event>CLICK</Event> / <Event>SCAN</Event> 大写;
      // <Event>subscribe</Event> / <Event>unsubscribe</Event> 小写。
      // 全部归一化为小写, 让 switch case 不依赖大小写。
      const event = (get('Event') || '').toLowerCase() as EventType;
      return {
        ...base,
        event,
        eventKey: get('EventKey') || undefined,
        ticket: get('Ticket') || undefined,
      } as WeChatRecvMessage;
    default:
      return base as WeChatRecvMessage;
  }
}

// ============================================================================
// 构造被动回复
// ============================================================================

/**
 * 构造被动回复 (text)
 */
export function buildTextReply(
  original: Pick<WeChatRecvMessage, 'fromUserName' | 'toUserName'>,
  content: string
): string {
  return [
    '<xml>',
    '<ToUserName><![CDATA[' + original.fromUserName + ']]></ToUserName>',
    '<FromUserName><![CDATA[' + original.toUserName + ']]></FromUserName>',
    '<CreateTime>' + Math.floor(Date.now() / 1000) + '</CreateTime>',
    '<MsgType><![CDATA[text]]></MsgType>',
    '<Content><![CDATA[' + content + ']]></Content>',
    '</xml>',
  ].join('');
}

/**
 * 构造图文回复 (用于多链接场景)
 */
export interface ArticleItem {
  title: string;
  description?: string;
  picUrl?: string;
  url: string;
}

export function buildNewsReply(
  original: Pick<WeChatRecvMessage, 'fromUserName' | 'toUserName'>,
  articles: ArticleItem[]
): string {
  if (articles.length === 0) {
    return buildTextReply(original, '暂无内容');
  }

  const items = articles
    .slice(0, 10) // 微信限制最多 10 条
    .map(
      (a) => [
        '<item>',
        '<Title><![CDATA[' + a.title + ']]></Title>',
        a.description ? '<Description><![CDATA[' + a.description + ']]></Description>' : '',
        a.picUrl ? '<PicUrl><![CDATA[' + a.picUrl + ']]></PicUrl>' : '',
        '<Url><![CDATA[' + a.url + ']]></Url>',
        '</item>',
      ].join('')
    )
    .join('');

  return [
    '<xml>',
    '<ToUserName><![CDATA[' + original.fromUserName + ']]></ToUserName>',
    '<FromUserName><![CDATA[' + original.toUserName + ']]></FromUserName>',
    '<CreateTime>' + Math.floor(Date.now() / 1000) + '</CreateTime>',
    '<MsgType><![CDATA[news]]></MsgType>',
    '<ArticleCount>' + Math.min(articles.length, 10) + '</ArticleCount>',
    '<Articles>' + items + '</Articles>',
    '</xml>',
  ].join('');
}

/**
 * 空响应 (告诉微信"不处理", 避免重复推送)
 */
export function buildEmptyResponse(): string {
  return 'success';
}
