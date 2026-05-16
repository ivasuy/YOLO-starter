function assertContainer(container) {
  if (!container || typeof container.appendChild !== 'function') {
    throw new TypeError('Expected a DOM container with appendChild(...)');
  }
}

function getDocumentFromContainer(container) {
  if (container && container.ownerDocument) return container.ownerDocument;
  if (typeof document !== 'undefined') return document;
  return null;
}

function clearContainer(container) {
  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren();
    return;
  }
  while (container.firstChild) container.removeChild(container.firstChild);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstNonEmptyString(values) {
  for (const value of values) {
    if (isNonEmptyString(value)) return value.trim();
  }
  return '';
}

function coerceText(value) {
  if (value == null) return '';
  return String(value);
}

function applySingleLineEllipsis(element) {
  if (!element || !element.style) return;
  element.style.overflow = 'hidden';
  element.style.textOverflow = 'ellipsis';
  element.style.whiteSpace = 'nowrap';
  element.style.maxWidth = '100%';
}

function setTextAndTitle(element, value) {
  const text = coerceText(value);
  element.textContent = text;

  if (element && typeof element.removeAttribute === 'function') {
    if (isNonEmptyString(text)) element.setAttribute('title', text);
    else element.removeAttribute('title');
  } else if (element) {
    element.title = isNonEmptyString(text) ? text : '';
  }
}

function renderEmptyState(doc, message) {
  const empty = doc.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
}

function describeTimelineEvent(event) {
  if (event == null) {
    return { title: '(empty event)', meta: '' };
  }

  if (typeof event === 'string' || typeof event === 'number' || typeof event === 'boolean') {
    return { title: coerceText(event), meta: '' };
  }

  if (typeof event !== 'object') {
    return { title: coerceText(event), meta: '' };
  }

  const title =
    firstNonEmptyString([
      event.title,
      event.summary,
      event.message,
      event.type,
      event.name,
      event.action,
    ]) || '(event)';

  const at = firstNonEmptyString([event.at, event.time, event.timestamp, event.date]);
  const task = firstNonEmptyString([event.taskId, event.task_id, event.task]);
  const metaParts = [];
  if (at) metaParts.push(at);
  if (task) metaParts.push(task);

  return { title, meta: metaParts.join(' • ') };
}

function describeWorktree(worktree, index) {
  if (worktree == null) {
    return { title: `Worktree ${index + 1}`, subtitle: '' };
  }

  if (typeof worktree === 'string') {
    return { title: worktree, subtitle: '' };
  }

  if (typeof worktree !== 'object') {
    return { title: coerceText(worktree), subtitle: '' };
  }

  const title =
    firstNonEmptyString([worktree.name, worktree.path, worktree.id, worktree.branch]) ||
    `Worktree ${index + 1}`;

  const subtitle = firstNonEmptyString([
    worktree.branch,
    worktree.head,
    worktree.commit,
    worktree.sha,
  ]);

  return { title, subtitle };
}

export function renderTimeline(viewModel, container) {
  assertContainer(container);
  const doc = getDocumentFromContainer(container);
  if (!doc) throw new Error('renderTimeline requires a DOM-like document');

  clearContainer(container);

  const timeline = Array.isArray(viewModel && viewModel.timeline) ? viewModel.timeline : [];

  const section = doc.createElement('section');
  section.className = 'timeline';

  const header = doc.createElement('div');
  header.className = 'timeline__header';
  const title = doc.createElement('h2');
  title.className = 'timeline__title';
  title.textContent = 'Timeline';
  header.appendChild(title);
  section.appendChild(header);

  if (timeline.length === 0) {
    section.appendChild(renderEmptyState(doc, 'No timeline events.'));
    container.appendChild(section);
    return;
  }

  const list = doc.createElement('ol');
  list.className = 'timeline__list';

  for (const event of timeline) {
    const { title: eventTitle, meta } = describeTimelineEvent(event);
    const item = doc.createElement('li');
    item.className = 'timeline__item';

    const primary = doc.createElement('div');
    primary.className = 'timeline__item-title';
    setTextAndTitle(primary, eventTitle);
    applySingleLineEllipsis(primary);
    item.appendChild(primary);

    if (isNonEmptyString(meta)) {
      const metaEl = doc.createElement('div');
      metaEl.className = 'timeline__item-meta';
      setTextAndTitle(metaEl, meta);
      applySingleLineEllipsis(metaEl);
      item.appendChild(metaEl);
    }

    list.appendChild(item);
  }

  section.appendChild(list);
  container.appendChild(section);
}

export function renderWorktrees(viewModel, container) {
  assertContainer(container);
  const doc = getDocumentFromContainer(container);
  if (!doc) throw new Error('renderWorktrees requires a DOM-like document');

  clearContainer(container);

  const worktrees = Array.isArray(viewModel && viewModel.worktrees) ? viewModel.worktrees : [];
  const metadata = viewModel && viewModel.metadata && typeof viewModel.metadata === 'object' ? viewModel.metadata : null;

  const section = doc.createElement('section');
  section.className = 'worktrees';

  const header = doc.createElement('div');
  header.className = 'worktrees__header';

  const title = doc.createElement('h2');
  title.className = 'worktrees__title';
  title.textContent = 'Worktrees';
  header.appendChild(title);

  if (metadata) {
    const hint = firstNonEmptyString([metadata.repoName, metadata.repo, metadata.root, metadata.cwd]);
    if (hint) {
      const context = doc.createElement('div');
      context.className = 'worktrees__context';
      setTextAndTitle(context, hint);
      applySingleLineEllipsis(context);
      header.appendChild(context);
    }
  }

  section.appendChild(header);

  if (worktrees.length === 0) {
    section.appendChild(renderEmptyState(doc, 'No worktrees.'));
    container.appendChild(section);
    return;
  }

  const list = doc.createElement('ul');
  list.className = 'worktrees__list';

  worktrees.forEach((worktree, index) => {
    const { title: worktreeTitle, subtitle } = describeWorktree(worktree, index);
    const item = doc.createElement('li');
    item.className = 'worktrees__item';

    const primary = doc.createElement('div');
    primary.className = 'worktrees__item-title';
    setTextAndTitle(primary, worktreeTitle);
    applySingleLineEllipsis(primary);
    item.appendChild(primary);

    if (isNonEmptyString(subtitle) && subtitle !== worktreeTitle) {
      const sub = doc.createElement('div');
      sub.className = 'worktrees__item-subtitle';
      setTextAndTitle(sub, subtitle);
      applySingleLineEllipsis(sub);
      item.appendChild(sub);
    }

    list.appendChild(item);
  });

  section.appendChild(list);
  container.appendChild(section);
}
