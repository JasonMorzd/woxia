# Woxia 毛衣款式库 MVP

这是一个手机优先的毛衣外贸款式资料库，包含款号、图片、纱线成分、颜色尺码、报价历史、自定义字段、图片检索、批量导入、审核队列和飞书事件接收接口。

## 启动

```bash
npm install
npm start
```

打开 <http://127.0.0.1:4173/>

首次启动会自动创建 `data/db.json` 和 5 条演示款式。后续运行数据会持续保存在本地 JSON 文件中，替换为 PostgreSQL + 对象存储时，业务接口层可以继续复用。

## Docker 部署

这台 Docker CE 服务器可以直接部署当前 MVP。2 核 2G 适合先跑单个 Node 容器和 JSON 数据卷；不要在同一台机器上部署本地视觉大模型。

在服务器上执行：

```bash
git clone <你的代码仓库地址> woxia
cd woxia
cp .env.example .env
```

编辑 `.env`，至少设置一个外部访问端口；如果接飞书，再填写两个飞书安全变量：

```dotenv
WOXIA_PORT=4173
FEISHU_VERIFICATION_TOKEN=替换成飞书配置中的值
FEISHU_ENCRYPT_KEY=替换成飞书配置中的值
AI_PROVIDER=local-demo-adapter
```

启动：

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f woxia
```

浏览器访问：

```text
http://服务器公网IP:4173/
```

默认数据保存在 Docker named volume `woxia-data`，容器重建不会丢失。查看数据卷：

```bash
docker volume inspect woxia-data
```

建议上线前：

1. 云服务器安全组只开放 `22`、`80`、`443`，不要长期暴露 `4173`。
2. 用 Nginx/Caddy 将域名转发到 `127.0.0.1:4173`，并配置 HTTPS。
3. 定期备份 `woxia-data`，至少保留一份服务器外的备份。
4. 首次登录后替换演示数据；当前 MVP 的角色切换是演示权限，不是正式账号系统。

飞书回调地址应填写 HTTPS 域名：

```text
https://你的域名/api/feishu/events
```

如果暂时没有域名，也可以先通过 `http://服务器公网IP:4173/` 体验网页；飞书正式事件订阅通常应使用 HTTPS 反向代理。

## 主要入口

- `POST /api/styles`：创建款号
- `GET /api/styles/:id`：获取款号详情
- `POST /api/search`：文字、字段和图片联合检索
- `POST /api/assets`：上传图片
- `POST /api/imports/preview`：预览 CSV、TSV 或 XLSX
- `POST /api/imports/commit`：正式导入
- `GET /api/review-queue`：待审核资料
- `POST /api/review-queue/:id`：通过或驳回审核
- `GET /api/quotes`：查询报价历史
- `POST /api/custom-fields`：新增自定义字段
- `POST /api/feishu/events`：飞书事件订阅地址

## 飞书配置

在飞书自建应用中：

1. 开启机器人能力。
2. 配置事件订阅地址为 `https://你的域名/api/feishu/events`。
3. 订阅消息事件，并按实际组织权限开放群消息和通讯录范围。
4. 将飞书事件转发到本系统后，资料会进入审核队列。

当前 MVP 已处理 URL verification、事件幂等、文字消息和图片消息的待审核入队。设置 `FEISHU_VERIFICATION_TOKEN` 后会校验 URL verification token；设置 `FEISHU_ENCRYPT_KEY` 后会校验飞书事件签名。正式上线时仍应在反向代理层配置 HTTPS，并接入对象存储和 PostgreSQL。

## 演示角色

顶部角色切换用于验证权限：

- 管理员：可查看报价、导入、审核和管理自定义字段
- 负责人：可查看报价、导入、审核和管理自定义字段
- 业务员：可以检索和新建，但默认看不到报价
- 只读用户：只能检索和查看基础资料
