import { Bot, Context, Fragment, Schema, SendOptions, Universal, h } from '@satorijs/satori'
import { WsClient } from './ws'
import { IIROSE_BotMessageEncoder } from './sendMessage'
import kick from './encoder/admin/kick'
import mute from './encoder/admin/mute'
import pako from 'pako'
import { messageObjList } from './messageTemp'

export class IIROSE_Bot extends Bot<IIROSE_Bot.Config> {
  platform: string = 'iirose';

  constructor(ctx: Context, config: IIROSE_Bot.Config) {
    super(ctx, config)
    ctx.plugin(WsClient, this)
    this.nickname = ctx.config.usename
    this.username = ctx.config.usename
    this.userId = ctx.config.uid
  }

  sendMessage(channelId: string, content: Fragment, guildId?: string, options?: SendOptions): Promise<string[]> {
    return new IIROSE_BotMessageEncoder(this, `${channelId}:` + guildId, guildId, options).send(content)
  }

  async sendPrivateMessage(channelId: string, content: Fragment, options?: SendOptions): Promise<string[]> {
    return this.sendMessage(`private:${channelId}`, content)
  }

  async getSelf(): Promise<Universal.User> {
    return {
      userId: this.ctx.config.uid,
      username: this.ctx.config.usename
    }
  }

  async getGuildList(): Promise<Universal.Guild[]> {
    return [
      {
        guildId: this.ctx.config.roomId,
        guildName: 'IIROSE 群聊'
      }
    ]
  }

  async getMessage(channelId: string, messageId: string) {
    return messageObjList[messageId]
  }

  async kickGuildMember(guildId: string, userName: string, permanent?: boolean): Promise<void> {
    this.send(kick(userName))
  }

  async muteGuildMember(guildId: string, userName: string, duration: number, reason?: string): Promise<void> {
    let time: string

    // 永久禁言
    if ((duration / 1000) > 99999) {
      time = '&'
    } else {
      time = String(duration / 1000)
    }

    this.send(mute('all', userName, time, reason))
  }

  send(data: string) {
    const buffer = Buffer.from(data)
    const unintArray = Uint8Array.from(buffer)

    if (unintArray.length > 256) {
      const deflatedData = pako.gzip(data)
      const deflatedArray = new Uint8Array(deflatedData.length + 1)
      deflatedArray[0] = 1
      deflatedArray.set(deflatedData, 1)
      this.socket.send(deflatedArray)
    } else {
      this.socket.send(unintArray)
    }
  }
}

export namespace IIROSE_Bot {
  export interface BaseConfig extends Bot.Config { }

  export interface Config extends BaseConfig {
    usename: string
    password: string
    roomId: string
  }

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      usename: Schema.string().required().description('BOT用户名'),
      uid: Schema.string().required().description('BOT的唯一标识'),
      password: Schema.string().required().description('BOT的密码的32位md5'),
      roomId: Schema.string().required().description('BOT的初始房间地址'),
    }).description('BOT配置'),
    Schema.object({
      picLink: Schema.string().description('图床接口').default('https://f.iirose.com/lib/php/system/file_upload.php'),
      picBackLink: Schema.string().description('图床返回url(data为接口返回的data)').default('http://r.iirose.com/[data]'),
      musicLink: Schema.string().description('网易云音乐解析接口').default('https://api.xiaobaibk.com/api/music.163/?id=[musicid]'),
    }).description('其他配置'),
  ])
}

IIROSE_Bot.prototype.platform = 'IIROSE_Bot'
