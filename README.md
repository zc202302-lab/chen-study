# Chen Study

个人多课程学习平台。ChatGPT Work 负责教学与课程管理，自有服务器保存权威学习数据，GitHub 负责程序版本和部署文件。

## 当前阶段

2026-11-03：阶段0基础环境检查完成；尚未部署测试应用。Work 网页读取、写入、定时运行三项验证均未通过，不能进入完整平台开发。服务器内部信息依据用户提供的终端截图，不代表开发环境已取得SSH连接。

## 已核实环境

| 项目 | 结果 |
|---|---|
| 正式域名 | study.ziboxiaozhushou.cn |
| 公网IP及DNS A记录 | 47.104.233.200 |
| 操作系统 | Alibaba Cloud Linux 3.2104 U13.3，x86_64 |
| CPU / 内存 | 2核 / 1.8 GiB，检查时可用约1.3 GiB |
| Swap / 磁盘 | 4 GiB / 系统盘40 GB，检查时剩余24 GB |
| Docker / Compose | 26.1.3 / v2.27.0 |
| 共享入口 | sms-relay-caddy-1，镜像caddy:2，占用80/443 |
| Caddy配置挂载 | /opt/sms-relay/Caddyfile → /etc/caddy/Caddyfile，单文件bind挂载 |
| 入口网络 | sms-relay_default，网关172.19.0.1 |
| 现有Compose文件 | /opt/sms-relay/compose.yml |

现有路由：sms.ziboxiaozhushou.cn → ntfy:80；assistant.ziboxiaozhushou.cn → 172.19.0.1:8010；jituan.zbassistant.site指定路径 → 8010、其余404；cook.ziboxiaozhushou.cn → 172.19.0.1:8020。8010/8020由宿主机uvicorn进程监听。Study域名尚未配置。

当前Work云端浏览器已实际导航到/work-test，但只取得上游连接错误；这不证明原服务器宕机，也不证明Work读写可行。当前执行环境SSH连接返回Network is unreachable。

## 部署候选方案

Next.js、TypeScript、Tailwind CSS、PostgreSQL、Docker Compose；GitHub Actions构建镜像，服务器运行镜像。具体版本、镜像获取通道、自动部署权限、备份目标和容量仍待验证。

独立目录/opt/chen-study；独立Compose项目、容器和数据卷。应用连接现有Caddy网络，数据库仅连接项目内部网络，不发布数据库公网端口。通过网络别名接入Caddy，不占用8010/8020。

## 阶段1范围与验收

仅实现/work-test、虚构测试课程、数据库持久化、最小操作日志及适用于浏览器的管理认证，不导入真实学习数据。

1. 读取：Work准确读取课程编号、当前期数、完成状态、下一期资格和记录版本。
2. 写入：通过页面将pending更新为completed；服务器事务提交，刷新后保留；独立SQL查询确认记录及操作日志，页面提示不能替代数据库验证。
3. 定时：用户在Work创建北京时间09:00测试任务，实际无人值守调用云端浏览器完成读写；验证登录状态、权限、工具可用性和运行日志。手动运行成功不能替代定时成功。
4. 重复与异常：使用唯一操作编号防重复；记录失败；测试登录过期及重复执行。未验证的能力始终标记未验证。

任何一项受Plus现有能力限制时停止依赖该能力的开发，与用户讨论免费替代方式。禁止擅自改用付费API或付费自动化服务。现有课程任务不在本阶段修改范围内。

## 正式业务约束

课程、阶段、期数、教学结构、题型、数量和晋级规则全部可配置；正确率与完成条件分离。历史课程、题目与规则保留版本。服务器根据Asia/Shanghai强制校验下一期最早发布时间：本次09:00批改完成，最早次日09:00发布。同一执行批次不得批改完成后立即发布下一期。

## 现有项目保护

不得覆盖或删除/opt/chen-assistant、/opt/chen-cook、/opt/sms-relay、/opt/us-relay，不清理共享Docker资源，不重启整个sms-relay项目。Caddy变更只新增Study块，先备份、校验，再平滑加载，失败时恢复原内容并复核已有站点。

Caddyfile为单文件bind挂载：更新时必须考虑原子替换可能导致容器仍引用旧文件的问题；不能只凭宿主机文件内容宣布生效，需核对容器所见内容与运行结果。

GitHub不保存测验答案、问答或进度，不提交密码、私钥、令牌或.env。数据库备份必须包含恢复演练，服务器同盘副本不算异地备份。
