const axios = require('axios')

let passTicket = 'sSahbJTWSivn5k8ivFM8iym1aU2ezvTAyu4x9z%2BonR5ZABqJwXH5AOEf4nJUF%2B4E'
let skey = '@crypt_2c1c67b4_e4cc35acbd17c490064ed65130b2e5b3'

function getContact () {
  axios.get('https://wx2.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact', {
    params: {
      lang: 'zh_CN',
      pass_ticket: passTicket,
      r: new Date().valueOf(),
      seq: 0,
      skey: skey
    },
    headers: {
      'Cookie': 'wxuin=1009564500; wxsid=a87aRikSrkcT8yCl; wxloadtime=1500707594; mm_lang=zh_CN; webwx_data_ticket=gSd82XyaDhsiCxBqAuweFyCy; webwxuvid=3aa133eeacddb8bc4f0991db755be60edd5a562c9af58d9a474fea4d0b7c2f9e0598eb5008271887c1b58cd5fc676133; webwx_auth_ticket=CIsBELrwk+IHGoABV2UPqxNuP5z3iPb1JDk2O7bSihx/ZYCMRPkriOzWYJUvDkGjg40h68c9WgSbWVdNiNUSrYG+uLEiizm6zK1ia2/nf/9CayqdujslnwnO8SWoN7SQn/LrkJ+W4ZQWkn+rDTVaP6kRoPwpIF0E+nLbHBCU3iG0ExtOXq5DXFaWGN0='
    }
  }).then(res => {
    console.log(res.data.MemberCount)
  }).catch(err => {
    console.log(err)
  })
}

getContact()
