import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CharacterMemory, ImportPreview, SessionBinding } from '../model.ts';
import { action, api, query, upload } from './api.ts';
import type { BrowserInfo, ClientIdentity } from './api.ts';

interface CharacterData {
  memories: CharacterMemory[];
  sources: Array<{ source_id: string; preview: ImportPreview }>;
  bindings: SessionBinding[];
  recovery: { text: string; token_upper_bound: number; omitted: number };
}
interface Props {
  onClose?: () => void;
}

export function ContinuityPanel({ onClose }: Props): ReactNode {
  const [info, setInfo] = useState<BrowserInfo>();
  const [scope, setScope] = useState<ClientIdentity>({
    agent_id: 'companion',
    character_id: 'character',
    story_id: null,
  });
  const [workspace, setWorkspace] = useState('');
  const [preview, setPreview] = useState<{ upload_id: string; preview: ImportPreview }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [data, setData] = useState<CharacterData>();
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pasted, setPasted] = useState('');
  const [session, setSession] = useState('');
  const [provider, setProvider] = useState('deepseek-official');
  const [model, setModel] = useState('deepseek-flash');
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState<Array<{ role: string; text: string }>>([]);
  const controller = useRef<AbortController>();
  const [editing, setEditing] = useState<{ id: string; text: string }>();
  const load = async () => setData(await api<CharacterData>(`/data?${query(scope)}`));
  useEffect(() => {
    setData(undefined);
    setSession('');
    setReplies([]);
    setEditing(undefined);
  }, [scope.agent_id, scope.character_id, scope.story_id]);
  const run = async (label: string, operation: () => Promise<void>) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy('');
    }
  };
  const refreshInfo = useCallback(async (signal?: AbortSignal) => {
    const value = await api<BrowserInfo>('/info', signal ? { signal } : undefined);
    setInfo(value);
    setWorkspace((current) =>
      value.workspaces.some((item) => item.id === current)
        ? current
        : (value.workspaces[0]?.id ?? ''),
    );
    return value;
  }, []);
  useEffect(() => {
    const lifetime = new AbortController();
    const deadline = Date.now() + 10000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      try {
        const value = await refreshInfo(lifetime.signal);
        if (!value.workspaces.length && Date.now() < deadline && !lifetime.signal.aborted)
          timer = setTimeout(() => void read(), 500);
      } catch (failure) {
        if (!lifetime.signal.aborted) setError(String(failure));
      }
    };
    void read();
    return () => {
      lifetime.abort();
      if (timer) clearTimeout(timer);
      controller.current?.abort();
    };
  }, [refreshInfo]);
  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (info && file.size > info.max_upload_bytes) {
      setError('文件超过当前 DSH 的上传上限');
      return;
    }
    await run('上传并解析中', async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      setProgress(0);
      const value = await upload<{ upload_id: string; preview: ImportPreview }>(
        file,
        setProgress,
        controller.current.signal,
      );
      setPreview(value);
      setBranches({});
      setSelected(
        value.preview.conversations
          .filter((conversation) => conversation.supported)
          .map((conversation) => conversation.id),
      );
      setNotice('解析完成。原始记录尚未保存；确认选择后开始迁移。');
    });
  };
  const migrate = async () =>
    run('正在迁移', async () => {
      if (!preview) return;
      const result = await action<{
        source_id: string;
        imported: Array<{ session_id: string }>;
        duplicates: Array<{ session_id: string }>;
        failures: Array<{ error: string }>;
      }>(scope, {
        action: 'commit',
        upload_id: preview.upload_id,
        selected,
        workspace_id: workspace,
        branches: Object.fromEntries(Object.entries(branches).filter(([, branch]) => branch)),
      });
      if (result.failures.length)
        setError(result.failures.map((failure) => failure.error).join('\n'));
      setSession(result.imported[0]?.session_id ?? result.duplicates[0]?.session_id ?? '');
      for (const id of selected)
        await action(scope, {
          action: 'extract',
          source_id: result.source_id,
          conversation_id: id,
          ...(branches[id] ? { branch_id: branches[id] } : {}),
        });
      await load();
      setPreview(undefined);
      setNotice(
        `迁移完成：新增 ${result.imported.length} 个对话，识别 ${result.duplicates.length} 个重复对话。请审核记忆候选。`,
      );
    });
  const saveBackup = async () =>
    run('正在生成备份', async () => {
      const response = await fetch(`/api/dsh-continuity/export?${query(scope)}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('备份下载失败');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dsh-continuity-backup.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('备份包含私密聊天，请妥善保管。该文件未加密。');
    });
  const restore = async (file?: File) => {
    if (!file) return;
    await run('正在恢复备份', async () => {
      if (info && file.size > info.max_upload_bytes) throw new Error('备份超过上传上限');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      await action(scope, { action: 'restore', package_base64: btoa(binary) });
      await load();
      setNotice('角色档案、记忆和原始来源已恢复；正式 DSH 对话可从来源重新迁移。');
    });
  };
  return (
    <section className="continuity-panel" aria-label="聊天迁移与角色记忆">
      <header>
        <div>
          <p className="continuity-eyebrow">DSH CONTINUITY</p>
          <h1>把故事带到下一次对话</h1>
          <p>保留聊天 · 审核记忆 · 继续相伴</p>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="关闭迁移界面">
            关闭
          </button>
        )}
      </header>
      <aside className="continuity-privacy">
        文件将发送到 <strong>你当前连接的 DSH 主机</strong>{' '}
        处理和保存，而非第三方记忆服务。记忆需你确认后使用。手机访问远程主机时，请使用可信 HTTPS
        连接。
      </aside>
      <section className="continuity-card">
        <h2>1 · 选择你要继续的角色</h2>
        <div className="continuity-fields">
          <label>
            助手档案
            <input
              aria-label="助手档案"
              value={scope.agent_id}
              onChange={(event) => setScope({ ...scope, agent_id: event.target.value })}
            />
          </label>
          <label>
            角色名称
            <input
              aria-label="角色名称"
              value={scope.character_id}
              onChange={(event) => setScope({ ...scope, character_id: event.target.value })}
            />
          </label>
          <label>
            故事名称（可选）
            <input
              aria-label="故事名称"
              value={scope.story_id ?? ''}
              onChange={(event) => setScope({ ...scope, story_id: event.target.value || null })}
            />
          </label>
          <label>
            保存位置
            <select
              aria-label="保存位置"
              value={workspace}
              onChange={(event) => setWorkspace(event.target.value)}
            >
              <option value="">选择现有 DSH 工作区</option>
              {info?.workspaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          disabled={!!busy}
          onClick={() =>
            run('刷新工作区', async () => {
              await refreshInfo();
            })
          }
        >
          刷新保存位置
        </button>
        {!info?.workspaces.length && (
          <p className="continuity-warning">
            正在等待 DSH 工作区。请在主界面选择工作区后刷新保存位置。
          </p>
        )}
        <button disabled={!!busy} onClick={() => run('读取角色档案', load)}>
          读取已保存的角色
        </button>
      </section>
      <section className="continuity-card">
        <h2>2 · 带入你的聊天记录</h2>
        <details>
          <summary>如何从 DeepSeek App 导出？</summary>
          <p>
            在已安装 App
            的头像、设置或数据管理中查看是否有历史导出功能。版本、地区和系统可能不同；获得官方 ZIP
            后直接选择，无需解压。若没有导出入口，复制或分享一段对话，按“用户：”“助手：”标明说话者。
          </p>
        </details>
        <label className="continuity-file">
          选择 ZIP / TXT / Markdown / JSON
          <input
            aria-label="选择聊天文件"
            type="file"
            accept=".zip,.txt,.md,.markdown,.json"
            disabled={!!busy}
            onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <details>
          <summary>应急方式：粘贴单个对话</summary>
          <label>
            复制的对话
            <textarea
              aria-label="复制的对话"
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder={'用户：请叫我小禾\n助手：好的，小禾'}
            />
          </label>
          <button
            disabled={!!busy || !pasted}
            onClick={() =>
              chooseFile(new File([pasted], 'copied-chat.txt', { type: 'text/plain' }))
            }
          >
            解析粘贴内容
          </button>
        </details>
        {busy && (
          <div role="status">
            <p>
              {busy} {progress ? `${progress}%` : ''}
            </p>
            <progress max="100" value={progress || undefined} />
            <button onClick={() => controller.current?.abort()}>取消上传</button>
          </div>
        )}
        {preview && (
          <div className="continuity-report">
            <h3>解析报告</h3>
            <p>
              {preview.preview.conversation_count} 个对话 · {preview.preview.message_count} 条消息 ·{' '}
              {preview.preview.attachment_count} 个附件引用
            </p>
            <ul>
              {preview.preview.conversations.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      disabled={!item.supported}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, item.id]
                            : selected.filter((id) => id !== item.id),
                        )
                      }
                    />
                    {item.title ?? '未知标题'} · {item.message_count} 条 · {item.branches.length}{' '}
                    个分支
                  </label>
                  {item.branches.length > 1 && (
                    <label>
                      导入分支
                      <select
                        aria-label={`导入分支 ${item.id}`}
                        value={branches[item.id] ?? ''}
                        disabled={!!busy || !selected.includes(item.id)}
                        onChange={(event) =>
                          setBranches({ ...branches, [item.id]: event.target.value })
                        }
                      >
                        <option value="">官方默认（{item.active_branch ?? '未知'}）</option>
                        {item.branches.map((branch) => (
                          <option key={branch} value={branch}>
                            分支 {branch}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {item.warnings.map((warning, index) => (
                    <p className="continuity-warning" key={index}>
                      {warning}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            <button disabled={!!busy || !workspace || !selected.length} onClick={migrate}>
              保存原始记录并迁移
            </button>
            <button
              onClick={() =>
                run('取消暂存', async () => {
                  await action(scope, { action: 'discard-upload', upload_id: preview.upload_id });
                  setPreview(undefined);
                })
              }
            >
              清除暂存文件
            </button>
          </div>
        )}
      </section>
      <section className="continuity-card">
        <h2>3 · 审核角色记忆</h2>
        <p>候选来自原文，不自动等同于事实。角色台词属于故事；确认或编辑后再继续。</p>
        {data?.memories.length ? (
          <ul className="continuity-memories">
            {data.memories.map((memory) => (
              <li key={memory.memory_id}>
                <div className="continuity-memory-top">
                  <span>
                    {memory.memory_type} · {memory.status}
                  </span>
                  <span>{memory.source_kind}</span>
                </div>
                {editing?.id === memory.memory_id ? (
                  <textarea
                    aria-label="编辑记忆内容"
                    value={editing.text}
                    onChange={(event) => setEditing({ ...editing, text: event.target.value })}
                  />
                ) : (
                  <p>{memory.content}</p>
                )}
                <details>
                  <summary>查看原始出处</summary>
                  <blockquote>{memory.source_excerpt}</blockquote>
                  <p>
                    来源对话 {memory.source_session_id} · 消息 {memory.source_message_id}
                  </p>
                </details>
                <div className="continuity-actions">
                  {editing?.id === memory.memory_id ? (
                    <button
                      disabled={!!busy}
                      onClick={() =>
                        run('保存记忆', async () => {
                          await action(scope, {
                            action: 'edit',
                            memory_id: memory.memory_id,
                            expected_version: memory.version,
                            content: editing.text,
                          });
                          setEditing(undefined);
                          await load();
                        })
                      }
                    >
                      保存修改（重新审核）
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={
                          !!busy ||
                          memory.status === 'active' ||
                          memory.source_kind === 'unknown' ||
                          memory.source_kind === 'inference'
                        }
                        onClick={() =>
                          run('确认记忆', async () => {
                            await action(scope, {
                              action: 'confirm',
                              memory_id: memory.memory_id,
                              expected_version: memory.version,
                              replace: memory.conflicts_with,
                            });
                            await load();
                          })
                        }
                      >
                        {memory.conflicts_with.length ? '确认替换冲突记忆' : '确认记住'}
                      </button>
                      <button
                        disabled={!!busy}
                        onClick={() => setEditing({ id: memory.memory_id, text: memory.content })}
                      >
                        编辑
                      </button>
                    </>
                  )}
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      run('删除记忆', async () => {
                        await action(scope, {
                          action: 'delete-memory',
                          memory_id: memory.memory_id,
                          expected_version: memory.version,
                        });
                        await load();
                      })
                    }
                  >
                    删除此记忆
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="continuity-empty">还没有记忆候选。先迁移聊天，或读取已保存的角色。</p>
        )}
      </section>
      <section className="continuity-card">
        <h2>4 · 继续原来的故事</h2>
        <p>
          模型由你在 DSH
          中已配置的服务提供；发送消息会使用该模型额度。恢复资料不保证不同模型逐字同一表现。
        </p>
        <div className="continuity-fields">
          <label>
            模型服务
            <input
              aria-label="模型服务"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            />
          </label>
          <label>
            模型
            <input
              aria-label="模型"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </label>
        </div>
        <button
          disabled={!!busy || !workspace}
          onClick={() =>
            run('创建新对话', async () => {
              const value = await action<{ session_id: string }>(scope, {
                action: 'new-session',
                workspace_id: workspace,
                provider,
                model,
              });
              setSession(value.session_id);
              await load();
              setNotice('新对话已恢复已确认记忆。');
            })
          }
        >
          新建对话并恢复记忆
        </button>
        <label>
          当前对话
          <select
            aria-label="当前对话"
            value={session}
            onChange={(event) => setSession(event.target.value)}
          >
            <option value="">选择对话</option>
            {data?.bindings.map((binding) => (
              <option key={binding.session_id} value={binding.session_id}>
                {binding.session_id.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <label>
          对角色说
          <textarea
            aria-label="对角色说"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button
          disabled={!!busy || !session || !message}
          onClick={() =>
            run('角色正在回应', async () => {
              const value = await action<{ messages: Array<{ role: string; text: string }> }>(
                scope,
                { action: 'followup', session_id: session, text: message, provider, model },
              );
              setReplies(value.messages);
              setMessage('');
            })
          }
        >
          继续对话
        </button>
        {replies.map((reply, index) => (
          <article className="continuity-reply" key={index}>
            <strong>{reply.role === 'user' ? '你' : scope.character_id}</strong>
            <p>{reply.text}</p>
          </article>
        ))}
      </section>
      <section className="continuity-card">
        <h2>备份与管理</h2>
        <p>
          备份包括原始聊天与记忆，未加密。删除来源记录与删除记忆是独立操作；已存 DSH
          对话由主机管理。
        </p>
        <button disabled={!!busy} onClick={saveBackup}>
          下载完整角色备份
        </button>
        <label className="continuity-file">
          恢复角色备份
          <input
            aria-label="恢复角色备份"
            type="file"
            accept=".json"
            disabled={!!busy}
            onChange={(event) => {
              void restore(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <details>
          <summary>删除管理</summary>
          <button
            disabled={!!busy}
            onClick={() => {
              if (window.confirm('删除此角色全部记忆？原始聊天与 DSH 对话保持不变。'))
                void run('删除全部记忆', async () => {
                  await action(scope, { action: 'delete-all-memories' });
                  await load();
                });
            }}
          >
            删除此角色全部记忆
          </button>
          {data?.sources.map((source) => (
            <p key={source.source_id}>
              {source.preview.filename}
              <button
                disabled={!!busy}
                onClick={() => {
                  if (
                    window.confirm(
                      '删除此原始资产？已确认记忆与正式 DSH 对话仍保留，出处全文将从此资产移除。',
                    )
                  )
                    void run('删除原始资产', async () => {
                      await action(scope, { action: 'delete-source', source_id: source.source_id });
                      await load();
                    });
                }}
              >
                删除原始资产
              </button>
            </p>
          ))}
        </details>
      </section>
      {notice && (
        <p className="continuity-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="continuity-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
