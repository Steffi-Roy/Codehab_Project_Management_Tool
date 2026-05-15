# Claude Code — Task saving, listing posting, and custom tag input

---

## 1. Fix: tasks and listings not saving

### Root cause
Anonymous users hitting insert operations get a Supabase auth error silently — the UI appears to accept input but nothing saves because there is no authenticated session yet.

### Fix — auth gate on action
Wrap every write operation with an auth check. If the user is anonymous (no email on their session), show the email prompt before proceeding.

Create a reusable hook `useRequireAuth()`:

```typescript
// hooks/useRequireAuth.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRequireAuth() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  async function requireAuth(action: () => void) {
    const { data: { session } } = await supabase.auth.getSession()
    
    // Anonymous session = no email
    if (!session?.user?.email) {
      setPendingAction(() => action)
      setShowPrompt(true)
      return
    }
    action()
  }

  async function handleEmailSubmit(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (!error) {
      setShowPrompt(false)
      // Show "check your email" message — don't fire the action yet
      // Action will fire after magic link is clicked and session upgrades
      // Store pendingAction in localStorage so it survives the redirect
      if (pendingAction) {
        localStorage.setItem('pendingAction', 'true')
      }
    }
  }

  return { requireAuth, showPrompt, setShowPrompt, handleEmailSubmit }
}
```

### Email prompt component
Create a minimal modal `<AuthPrompt />`:

```tsx
// Shown when anonymous user tries to write
<div // overlay>
  <div // modal card>
    <p>Enter your email to save your progress</p>
    <p style="font-size:12px; color: muted">No password needed — we'll send you a magic link</p>
    <input type="email" placeholder="you@example.com" />
    <button>Send magic link</button>
    <button onClick={dismiss}>Maybe later</button>
  </div>
</div>
```

Style it warmly — same card treatment as the rest of the app. Not a jarring modal.

### Apply to every write operation

**Adding a task (Schedule + My project page):**
```typescript
const { requireAuth } = useRequireAuth()

async function handleAddTask(text: string, weekId: string) {
  await requireAuth(async () => {
    const { error } = await supabase
      .from('tasks')
      .insert({ text, week_id: weekId, user_id: session.user.id, is_done: false })
    if (!error) refetchTasks()
  })
}
```

**Posting a collab listing:**
```typescript
async function handlePostListing(data: ListingData) {
  await requireAuth(async () => {
    const { error } = await supabase
      .from('collab_listings')
      .insert({ ...data, user_id: session.user.id })
    if (!error) refetchListings()
  })
}
```

**Replying to a listing:**
Same pattern — `requireAuth` wraps the insert.

**Casting a vote:**
Same pattern — `requireAuth` wraps the vote insert.

### Also check Supabase RLS policies
Make sure Row Level Security policies allow inserts for authenticated users:

```sql
-- tasks: users can only insert/read/update their own tasks
create policy "users manage own tasks"
on tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- collab_listings: authenticated users can insert
create policy "authenticated users can post listings"
on collab_listings for insert
to authenticated
with check (auth.uid() = user_id);

-- listing_replies: authenticated users can insert
create policy "authenticated users can reply"
on listing_replies for insert
to authenticated
with check (auth.uid() = user_id);

-- votes: authenticated users can insert/delete own votes
create policy "users manage own votes"
on votes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

## 2. Fix: custom tag input (replaces predefined chip selectors)

Replace the fixed chip selectors on:
- Collab listing form: "Skills you bring" and "Looking for"
- Project submission form: tag field

### Behaviour
- A few preset suggestions shown as chips to click (quick start)
- User can also type anything and press Enter or comma to create a custom tag
- Created tags appear as dismissible pill chips
- Max 8 tags total
- No tag longer than 24 characters

### Component: `<TagInput />`

```tsx
// components/TagInput.tsx
interface TagInputProps {
  label: string
  suggestions: string[]  // shown as quick-pick chips
  value: string[]        // current tags
  onChange: (tags: string[]) => void
  max?: number
  placeholder?: string
  colour?: 'purple' | 'teal'  // pill colour
}
```

### Visual behaviour

**Suggestions row** (shown above input, greyed out):
- Click a suggestion → it moves into the selected pills
- Already selected suggestions appear filled/active

**Selected tags** appear as dismissible pills inside the input area:
- Purple pills for "skills you bring": `background: #EEEDFE`, `color: #3C3489`, `border: 0.5px solid #AFA9EC`
- Teal pills for "looking for": `background: #E1F5EE`, `color: #085041`, `border: 0.5px solid #5DCAA5`
- Each pill has a small × to remove it

**Text input** sits at the end of the pill row:
- Placeholder: "Add a skill… press Enter"
- On Enter or comma keypress: trim the text, create a pill, clear the input
- On Backspace with empty input: remove the last pill
- Min-width 120px, grows with content

### Example structure
```tsx
<div className="tag-input-wrap">
  {/* Quick suggestions */}
  <div className="suggestions">
    {suggestions.filter(s => !value.includes(s)).map(s => (
      <button onClick={() => addTag(s)}>{s}</button>
    ))}
  </div>
  
  {/* Selected pills + type input */}
  <div className="pill-input-row">
    {value.map(tag => (
      <span className={`pill ${colour}`}>
        {tag}
        <button onClick={() => removeTag(tag)}>×</button>
      </span>
    ))}
    <input
      value={inputVal}
      onChange={e => setInputVal(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={value.length === 0 ? placeholder : ''}
    />
  </div>
</div>
```

### Suggestions to pre-populate

**Skills you bring / Looking for (Collab listing):**
`Designer`, `Developer`, `Marketer`, `No-code`, `AI/ML`, `Product`, `Copywriter`, `Data`, `DevOps`

**Project tag (submission form):**
`Tool`, `Community`, `Design`, `AI`, `Mobile`, `API`, `Open source`, `SaaS`

---

## 3. Fix: task input UX

The task add input currently does nothing visibly on submit. Fix:

- On Enter keypress OR plus button click: insert the task, clear the input, immediately show the new task row (optimistic UI — add to local state before the DB confirms)
- If the DB insert fails: remove the optimistic row and show a small inline error "Couldn't save — try again"
- Empty input should do nothing (no error, just ignore)
- After adding: focus returns to the input so user can keep typing tasks quickly

---

## Build order

1. Supabase RLS policies (unblocks everything else)
2. `useRequireAuth` hook + `<AuthPrompt />` component
3. Apply `requireAuth` to tasks, listings, replies, votes
4. `<TagInput />` component
5. Replace chip selectors on collab form with `<TagInput />`
6. Replace tag field on submission form with `<TagInput />`
7. Task input optimistic UI fix
