/**
 * @file 微信核心模块
 * @author Yaozong Sun <zzuu666@outlook.com>
 */
const axios = require('axios')
const opn = require('opn')

axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'

class WeChat {
  constructor () {
    this.loginURL = 'https://login.weixin.qq.com/'
    this.baseURL = 'https://wx2.qq.com/'
    this.uuid = ''
    this.tip = 1
    this.ticket = ''
    this.skey = ''
    this.sid = ''
    this.uin = ''
    this.passTicket = ''
    this.syncKey = null
    this.user = null
    this.memberCount = 0
    this.memberList = []
    this.cookie = []
  }
  /**
   * 程序入口登录与获取信息相关
   */
  async run () {
    await this.getUUID()
    this.showQR()
    let loginFlag = await this.waitLogin()
    while (!loginFlag) {
      loginFlag = await this.waitLogin()
    }
    await this.getCookie()
    await this.wxInit()
    await this.wxStatusNotifiy()
    this.wxSync()
    await this.wxGetContcat()
    this.getMessage()
  }
  async getMessage () {
    let messageJson = null
    while (1) {
      messageJson = await this.wxSyncCheck()
      if (parseInt(messageJson.retcode, 10) === 1102) {
        console.log('[Error] 消息同步出现异常 1102 ...')
        break
      }
      if (parseInt(messageJson.selector, 10) === 2) {
        await this.wxSync()
      }
    }
  }
  getTime () {
    return new Date().valueOf()
  }
  genBaseRequest () {
    let random = (Math.random() + '').substr(2, 15)
    return {'Uin': this.uin, 'Sid': this.sid, 'Skey': this.skey, 'DeviceID': 'e' + random}
  }
  getUUID () {
    let reg = new RegExp('window.QRLogin.code = 200; window.QRLogin.uuid = "([a-zA-Z0-9-=]*)";')
    return axios.get(`${this.loginURL}jslogin`, {
      params: {
        appid: 'wx782c26e4c19acffb',
        fun: 'new',
        lang: 'zh_CN',
        _: this.getTime()
      }
    }).then(res => {
      this.uuid = reg.exec(res.data)[1]
      console.log('已获取uuid...')
      return reg.exec(res.data)[1]
    }).catch(err => {
      this.uuid = ''
      console.log('获取uuid异常...' + err)
    })
  }
  showQR () {
    console.log('已获取登录二维码...')
    this.uuid && opn(`${this.loginURL}qrcode/${this.uuid}`)
  }
  waitLogin () {
    return axios.get(`${this.loginURL}cgi-bin/mmwebwx-bin/login`, {
      params: {
        loginicon: true,
        uuid: this.uuid,
        tip: this.tip,
        r: -907243799,
        _: this.getTime()
      }
    }).then(res => {
      let codeReg = new RegExp('window.code=([0-9]*);')
      let code = parseInt(codeReg.exec(res.data)[1], 10)
      if (code === 408) {
        this.tip = 1
        console.log('[Warning] 二维码等待超时...')
        return false
      }
      if (code === 201) {
        console.log('[OK] 已扫描二维码等待确认...')
        this.tip = 0
        return false
      }
      if (code === 200) {
        let ticketReg = new RegExp('ticket=([a-zA-Z0-9_@]*)')
        let scanReg = new RegExp('scan=([0-9]*)')
        this.ticket = ticketReg.exec(res.data)[1]
        this.scan = scanReg.exec(res.data)[1]
        console.log('[OK] 登录成功...')
        return true
      }
    }).catch(err => {
      console.log('等待登录异常...' + err)
    })
  }
  getCookie () {
    return axios.get(`${this.baseURL}cgi-bin/mmwebwx-bin/webwxnewloginpage`, {
      params: {
        ticket: this.ticket,
        uuid: this.uuid,
        scan: this.scan,
        fun: 'new',
        version: 'v2',
        lang: 'zh_CN'
      }
    }).then(res => {
      let xmlString = res.data
      let retReg = new RegExp('<ret>([0-9]*)</ret>')
      let skeyReg = new RegExp('<skey>([a-zA-Z0-9/_%@]*)</skey>')
      let sidReg = new RegExp('<wxsid>([a-zA-Z0-9/_%@+]*)</wxsid>')
      let uinReg = new RegExp('<wxuin>([a-zA-Z0-9/_%@]*)</wxuin>')
      let passTicketReg = new RegExp('<pass_ticket>([a-zA-Z0-9/_%@]*)</pass_ticket>')
      let ret = retReg.exec(xmlString)[1]
      if (parseInt(ret, 10)) {
        throw new Error('[Error] Cooike 获取出现异常')
      }
      this.skey = skeyReg.exec(xmlString)[1]
      this.sid = sidReg.exec(xmlString)[1]
      this.uin = uinReg.exec(xmlString)[1]
      this.passTicket = passTicketReg.exec(xmlString)[1]
      this.cookie = res.headers['set-cookie']
      console.log('[OK] 获取Cookie成功...')
      return true
    }).catch(err => {
      console.log('[Error] 获取Cookie出现异常...', err)
      return false
    })
  }
  wxInit () {
    let r = ~(new Date().valueOf())
    return axios({
      method: 'post',
      url: `${this.baseURL}cgi-bin/mmwebwx-bin/webwxinit?lang=zh_CN&pass_ticket=${this.passTicket}&r=${r}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        'BaseRequest': this.genBaseRequest()
      }
    }).then(res => {
      let json = res.data
      if (!json.BaseResponse.Ret) {
        this.syncKey = json.SyncKey
        this.user = json.User
        console.log('[OK] 微信初始化成功...')
        return true
      } else {
        console.log('[Error] 微信初始化出现异常...参数异常')
        return false
      }
    }).catch(err => {
      console.log('[Error] 微信初始化出现异常...', err)
      return false
    })
  }
  wxStatusNotifiy () {
    return axios({
      method: 'post',
      url: `${this.baseURL}cgi-bin/mmwebwx-bin/webwxstatusnotify?lang=zh_CN&pass_ticket=${this.passTicket}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        'BaseRequest': this.genBaseRequest(),
        'ClientMsgId': this.getTime(),
        'Code': 3,
        'FromUserName': this.user.UserName,
        'ToUserName': this.user.UserName
      }
    }).then(res => {
      let json = res.data
      if (!json.BaseResponse.Ret) {
        console.log('[OK] 消息通知开启成功...')
        return true
      } else {
        console.log('[Error] 消息通知开启失败...')
        return false
      }
    }).catch(err => {
      console.log('[Error] 消息通知开启失败...', err)
      return false
    })
  }
  parseCookie () {
    return this.cookie.map(el => el.split(';')[0]).join('; ')
  }
  wxGetContcat () {
    return axios.get(`${this.baseURL}cgi-bin/mmwebwx-bin/webwxgetcontact`, {
      params: {
        lang: 'zh_CN',
        pass_ticket: this.passTicket,
        r: this.getTime(),
        seq: 0,
        skey: this.skey
      },
      headers: {
        'Cookie': this.parseCookie()
      }
    }).then(res => {
      let json = res.data
      if (!json.BaseResponse.Ret) {
        this.memberCount = json.MemberCount
        this.memberList = json.MemberList
        console.log(`[OK] 获取联系人列表成功...共计 ${this.memberCount} 人`)
        return true
      } else {
        console.log('[Error] 获取联系人列表失败...')
        return false
      }
    }).catch(err => {
      console.log('[Error] 获取联系人列表失败...', err)
      return false
    })
  }
  wxSync () {
    return axios({
      method: 'post',
      url: `${this.baseURL}cgi-bin/mmwebwx-bin/webwxsync`,
      params: {
        sid: this.sid,
        skey: this.skey,
        lang: 'zh_CN',
        pass_ticket: this.passTicket
      },
      data: {
        'BaseRequest': this.genBaseRequest(),
        'SyncKey': this.syncKey,
        'rr': ~(this.getTime)
      },
      headers: {
        'Cookie': this.parseCookie()
      }
    }).then(res => {
      let json = res.data
      if (!json.BaseResponse.Ret) {
        this.syncKey = json.SyncKey
        console.log('[OK] 获取到新消息...')
        if (json.AddMsgList.length) {
          console.log(json.AddMsgList[0].Content)
        }
      }
      return true
    }).catch(err => {
      console.log('[ERROR] 同步机制错误...', err)
      return false
    })
  }
  genSyncKey () {
    return this.syncKey.List.map(el => el.Key + '_' + el.Val).join('|')
  }
  wxSyncCheck () {
    let random = (Math.random() + '').substr(2, 15)
    return axios.get('https://webpush.wx2.qq.com/cgi-bin/mmwebwx-bin/synccheck', {
      params: {
        r: this.getTime(),
        skey: this.skey,
        sid: this.sid,
        uin: this.uin,
        deviceid: 'e' + random,
        synckey: this.genSyncKey()
      },
      headers: {
        'Cookie': this.parseCookie()
      }
    }).then(res => {
      let reg = new RegExp('window.synccheck={retcode:"([0-9]+)",selector:"([0-9]+)"}')
      let exec = reg.exec(res.data)
      // 返回数据为 window.synccheck={retcode:"1102",selector:"0"}
      let info = {
        retcode: exec[1],
        selector: exec[2]
      }
      return info
    }).catch(err => {
      console.log('[Error] 消息同步轮询发生异常...', err)
    })
  }
  wxSendMessage (from, to, message) {
    let random = (Math.random() + '').substr(4, 4)
    axios({
      method: 'post',
      url: 'https://wx2.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg?lang=zh_CN',
      data: {
        'BaseRequest': this.genBaseRequest(),
        'Msg': {
          'ClientMsgId': this.getTime() + random,
          'Content': message,
          'FromUserName': from,
          'ToUserName': to,
          'Type': 1
        },
        'Scene': 0
      },
      headers: {
        'Cookie': this.parseCookie()
      }
    }).then(res => {
      let json = res.data
      if (!json.BaseResponse.Ret) {
        console.log(`[OK] 发送消息 [${message}] 成功...`)
      } else {
        console.log(`[Waring] 发送消息失败`)
      }
    }).catch(err => {
      console.log(`[Waring] 发送消息失败`, err)
    })
  }
}

const wechat = new WeChat()
wechat.run()
