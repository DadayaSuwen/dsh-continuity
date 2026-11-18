# Character continuity

用户拥有自己的对话资产。迁移原始记录、继续对话与长期记忆是三个不同概念。

## Language

**Owner / 数据所有者**：一个 DSH 实例中的明确数据归属身份；其角色、对话与记忆只对该身份开放。_Avoid_: 从聊天文字推断的用户身份。

**Character / 角色**：用户选择并确认的一个对话角色，具有独立名称和设定；同名角色仍可有不同身份。_Avoid_: 模型、Session。

**Agent identity / 助手身份**：用户为某个持续交互用途建立的稳定身份；某个运行中的 DSH Agent 对应一个会话，不等同于此稳定身份。_Avoid_: 用 DSH Session ID 充当长期 Agent ID。

**Source conversation / 来源对话**：平台导出中的原始聊天及其全部分支；它是保留与追溯的依据，不会被提取的记忆替代。_Avoid_: 摘要。

**Session / 当前会话**：用户在 DSH 中正在继续的对话历史；与来源对话有可记录的对应关系。_Avoid_: 长期记忆数据库。

**Memory candidate / 记忆候选**：来自具体消息、等待用户审阅的记忆描述；其内容尚未作为已确认记忆使用。_Avoid_: 已知事实。

**Confirmed memory / 已确认记忆**：用户确认的、带有来源与归属的记忆；可以编辑、失效或删除。_Avoid_: 模型推测。

**User fact / 用户事实**：来源为用户明确表达的信息；故事里的台词和角色设定不是现实用户事实。_Avoid_: AI 对用户的猜测。

**Relationship memory / 关系记忆**：用户与角色或角色之间在对话/故事中形成的关系状态与约定，不自动视作现实关系。_Avoid_: Persona。

**Story state / 剧情状态**：特定故事当前的时间线、场景、人物位置和未解决事件。_Avoid_: 现实用户信息。

**Recovery context / 恢复上下文**：为明确角色和当前会话选出的有限记忆与剧情信息；它引用事实但不是原始聊天。_Avoid_: 完整历史、系统命令。

**Migration package / 迁移包**：用户可独立保存并在另一 DSH 实例恢复的、有版本的角色/记忆/来源资产。_Avoid_: 单纯 Session 日志。
