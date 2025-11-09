# @home-dashboard/database

Shared database types, schemas, and queries for the Home Dashboard application.

## Features

- TypeScript types for all database tables
- Supabase client configuration
- Zod schemas for validation
- Common query functions
- Database migrations

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase (if not already done)

```bash
cd packages/database
supabase init
```

### 3. Link to your Supabase project

```bash
supabase link --project-ref your-project-ref
```

### 4. Run migrations

```bash
supabase db push
```

## Database Schema

The database includes the following tables:

- **users** - User profiles (extends Supabase auth)
- **families** - Family groups
- **family_members** - User-family relationships with roles
- **events** - Calendar events
- **chores** - Chore assignments and tracking
- **lists** - List containers (grocery, todo, custom)
- **list_items** - Individual list items

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access data from families they belong to
- Admins have full access within their families
- Children have limited access based on role

## Usage

### Creating a Supabase Client

```typescript
import { createSupabaseClient } from '@home-dashboard/database';

const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

### Using Query Functions

```typescript
import { getEvents, createEvent } from '@home-dashboard/database';

// Get events for a family
const events = await getEvents(
  supabase,
  familyId,
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Create a new event
const newEvent = await createEvent(supabase, {
  family_id: familyId,
  user_id: userId,
  title: 'Doctor Appointment',
  start_time: new Date('2025-01-15 10:00').toISOString(),
  end_time: new Date('2025-01-15 11:00').toISOString(),
  all_day: false,
});
```

### Validating Data with Zod

```typescript
import { EventSchema } from '@home-dashboard/database';

try {
  const validatedEvent = EventSchema.parse(eventData);
} catch (error) {
  console.error('Validation failed:', error);
}
```

## Generating Types from Supabase

To regenerate TypeScript types from your Supabase schema:

```bash
supabase gen types typescript --linked > src/types-generated.ts
```

## Development

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Format code
pnpm format
```
