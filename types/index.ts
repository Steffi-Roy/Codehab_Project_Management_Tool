export interface Week {
  id: string
  number: number
  theme: string
  submission_deadline: string
  voting_open: string
  voting_close: string
  meeting_link: string | null
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  email: string | null
  display_name: string
  handle: string | null
  avatar_color: string
  linkedin_url: string | null
  github_url: string | null
  about: string | null
  is_admin: boolean
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  week_id: string
  title: string
  description: string
  cover_image_url: string | null
  github_url: string
  video_url: string | null
  tag: 'Tool' | 'Design' | 'Community' | 'Other'
  collab_open: boolean
  created_at: string
  users?: User
  weeks?: Week
  votes?: Vote[]
  vote_count?: number
  user_voted?: boolean
}

export interface Vote {
  id: string
  project_id: string
  user_id: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  text: string
  is_done: boolean
  created_at: string
}

export interface Comment {
  id: string
  project_id: string
  user_id: string
  text: string
  created_at: string
  users?: User
}

export interface CollabListing {
  id: string
  user_id: string
  title: string
  description: string
  skills_offered: string[]
  looking_for: string[]
  github_url: string | null
  linkedin_url: string | null
  is_active: boolean
  created_at: string
  users?: User
  listing_replies?: ListingReply[]
}

export interface ListingReply {
  id: string
  listing_id: string
  user_id: string
  text: string
  created_at: string
  users?: User
}
