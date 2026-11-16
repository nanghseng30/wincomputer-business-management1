# Win Computer — Online Deployment & Namecheap Domain Handoff

## Current application

Win Computer သည် React/Vite frontend, Express/tRPC backend, Drizzle/MySQL database နှင့် secure username/password application session ကို အသုံးပြုထားသော online business management web app ဖြစ်သည်။ Phone, tablet, laptop နှင့် desktop များတွင် responsive layout ဖြင့် အသုံးပြုနိုင်သည်။ Public access request form ရှိသော်လည်း Owner များသာ User/Staff နှင့် Admin requests များကို စစ်ဆေးခွင့်ပြုပြီး account activation ပြုလုပ်နိုင်သည်။

## First production setup

1. Production application ကို publish ပြီး final host URL ရရှိအောင် စောင့်ပါ။
2. Production `WIN_APPROVAL_PASSWORD` ကို Webdev secure secret card မှာ သတ်မှတ်ပါ။ ဤ password သည် Owner login password နှင့် မတူရပါ။
3. Final HTTPS URL ကိုဖွင့်ပြီး `Create owner account` ကို တစ်ကြိမ်သာ အသုံးပြုပါ။ Owner username/password နှင့် approval password ကို သီးခြားထားပါ။
4. Owner account ဝင်ပြီး Settings ထဲရှိ Brand & Contact panel မှ ကြိုဆိုစာသား၊ ဖုန်း၊ Viber၊ Telegram နှင့် logo reference ကို သတ်မှတ်ပါ။
5. Owner က Team accounts ထဲတွင် pending access requests များကို စစ်ဆေးပြီး approve/reject လုပ်ပါ။ Approved account သည် profile photo နှင့် employee profile record ဖြင့် ဖန်တီးမည်ဖြစ်ပြီး အသုံးပြုသူက profile ကို confirm/complete လုပ်ပြီးမှ workspace API များကို အသုံးပြုနိုင်မည်။ Sensitive account, price, catalog, settings, notice, permission approval နှင့် lifecycle actions များကို server-side Owner authorization ဖြင့် ကာကွယ်ထားသည်။
6. Team accounts ထဲရှိ Online users & devices panel မှ လက်ရှိ online count၊ user၊ role၊ last-seen time နှင့် Phone/Tablet/Laptop/Desktop ခွဲခြားချက်ကို စစ်ဆေးနိုင်သည်။

## Namecheap domain ချိတ်ဆက်နည်း

Domain ဝယ်ယူခြင်းနှင့် DNS ပြောင်းခြင်းသည် registrar/hosting account ပိုင်ရှင်၏ ခွင့်ပြုချက်လိုသော external action ဖြစ်သောကြောင့် app က အလိုအလျောက် မဝယ်ပေးပါ။ Owner က Namecheap account ထဲတွင် ကိုယ်တိုင်ပြုလုပ်ရမည်။

1. Namecheap မှ ရရှိနိုင်သော domain ကို ရွေး၍ ဝယ်ပါ။ WHOIS privacy နှင့် account 2FA ကို ဖွင့်ထားပါ။
2. Application ကို publish ပြီး hosting provider ပေးသော custom-domain target ကို အတည်ပြုပါ။ Provider က ပေးသော record type ကိုသာ အသုံးပြုပါ။
3. Namecheap → Domain List → Manage → Advanced DNS တွင် provider ကပြောသည့် record ကို ထည့်ပါ။ ပုံမှန်ပုံစံများမှာ root domain အတွက် `A` record၊ `AAAA` record သို့မဟုတ် provider က သတ်မှတ်ပေးသော `CNAME` ဖြစ်သည်။ `www` အတွက်လည်း provider ညွှန်ကြားချက်နှင့် ကိုက်ညီသော `CNAME` ထည့်ပါ။
4. အဟောင်း `A`, `AAAA`, `CNAME` records များက final host နှင့် မကိုက်ပါက ဖယ်ရှားပါ။ Email သုံးနေပါက `MX`, `TXT`, SPF/DKIM records များကို မဖျက်ပါနှင့်။
5. DNS propagation ပြီးပါက hosting provider တွင် domain verification ပြီးစီးအောင်လုပ်ပါ။ HTTPS certificate ကို provider-managed TLS ဖြင့် activate လုပ်ပါ။
6. `https://your-domain.example/api/health` ကိုဖွင့်ပြီး `{"status":"ok"}` ရပါက public server health အောင်မြင်သည်။ ပြီးမှ root domain မှ login, Owner setup, responsive phone/tablet view, receipt create, notice, audit နှင့် logout ကို စစ်ပါ။

## Security rules

- Production ကို HTTPS ဖြင့်သာ အသုံးပြုပါ။ Login cookie သည် secure, httpOnly ဖြစ်ပြီး public HTTPS iframe/proxy အတွက် `SameSite=None` သုံးနိုင်သည်။
- Owner approval password ကို chat, screenshot, Git, `.env.example` သို့ မထည့်ပါနှင့်။ Webdev secret store သို့မဟုတ် password manager မှာသာ သိမ်းပါ။
- Domain ဝယ်ယူမှု၊ DNS change နှင့် production credentials များကို Owner ၏ explicit authorization မရှိဘဲ မပြုလုပ်ပါနှင့်။
- Managed online database နှင့် Windows LAN self-host database သည် အလိုအလျောက် sync မလုပ်ပါ။ Server တစ်ခုကိုသာ active source of truth အဖြစ် သတ်မှတ်ပါ။
- Database backup, restore နှင့် password rotation မပြုလုပ်မီ Owner approval နှင့် tested backup လိုအပ်သည်။

## Build and verification commands

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

Health endpoint: `GET /api/health`

Route manifest: `GET /manus-routes.json`
