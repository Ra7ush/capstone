create table if not exists public.comment_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  comment_id uuid references public.comments on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, comment_id)
);

alter table public.comments
add column if not exists likes_count bigint default 0,
add column if not exists replies_count bigint default 0,
add column if not exists parent_id uuid references public.comments(id) on delete cascade,
add column if not exists is_edited boolean default false;

alter table public.comment_likes enable row level security;

create policy "Public comment likes are viewable by everyone." on public.comment_likes for select using (true);
create policy "Users can insert their own comment likes." on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete their own comment likes." on public.comment_likes for delete using (auth.uid() = user_id);


create or replace function increment_comment_likes(comment_row_id uuid)
returns void as $$
begin
  update public.comments
  set likes_count = likes_count + 1
  where id = comment_row_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_comment_likes(comment_row_id uuid)
returns void as $$
begin
  update public.comments
  set likes_count = likes_count - 1
  where id = comment_row_id;
end;
$$ language plpgsql security definer;

create or replace function increment_comment_replies(parent_row_id uuid)
returns void as $$
begin
  update public.comments
  set replies_count = replies_count + 1
  where id = parent_row_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_comment_replies(parent_row_id uuid)
returns void as $$
begin
  update public.comments
  set replies_count = greatest(replies_count - 1, 0)
  where id = parent_row_id;
end;
$$ language plpgsql security definer;
