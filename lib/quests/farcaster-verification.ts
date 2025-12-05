/**
 * Farcaster Social Quest Verification
 * Phase 2.7: Quest Page Rebuild
 * 
 * Verify social activities via Neynar API
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

/**
 * Social verification data types
 */
export interface SocialVerificationData {
  type: 'follow_user' | 'like_cast' | 'recast' | 'reply_to_cast' | 'create_cast_with_tag' | 'join_channel';
  target_fid?: number;
  target_cast_hash?: string;
  target_channel_id?: string;
  required_tag?: string;
  min_engagement?: number;
}

export interface SocialVerificationResult {
  success: boolean;
  message: string;
  proof?: {
    verified_at: number;
    verified_data: Record<string, any>;
  };
}

/**
 * Fetch user profile from Neynar
 */
async function fetchUserProfile(fid: number) {
  const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/bulk?fids=${fid}`, {
    headers: {
      'api_key': NEYNAR_API_KEY || '',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.users?.[0];
}

/**
 * Verify user follows another user
 */
export async function verifyFollowUser(
  userFid: number,
  targetFid: number
): Promise<SocialVerificationResult> {
  try {
    const user = await fetchUserProfile(userFid);
    
    if (!user) {
      return {
        success: false,
        message: 'User profile not found',
      };
    }
    
    // Check if user follows target
    const followingResponse = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/following?fid=${userFid}&limit=1000`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!followingResponse.ok) {
      throw new Error('Failed to fetch following list');
    }
    
    const followingData = await followingResponse.json();
    const isFollowing = followingData.users?.some((u: any) => u.fid === targetFid);
    
    if (isFollowing) {
      return {
        success: true,
        message: `Successfully verified follow relationship`,
        proof: {
          verified_at: Date.now(),
          verified_data: {
            user_fid: userFid,
            target_fid: targetFid,
            verified_via: 'neynar_api',
          },
        },
      };
    }
    
    return {
      success: false,
      message: `User ${userFid} does not follow user ${targetFid}`,
    };
  } catch (error) {
    console.error('Follow verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify follow relationship',
    };
  }
}

/**
 * Verify user liked a cast
 */
export async function verifyLikeCast(
  userFid: number,
  castHash: string
): Promise<SocialVerificationResult> {
  try {
    // Fetch cast reactions
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/cast?identifier=${castHash}&type=hash`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch cast');
    }
    
    const data = await response.json();
    const cast = data.cast;
    
    if (!cast) {
      return {
        success: false,
        message: 'Cast not found',
      };
    }
    
    // Check if user liked the cast
    const reactionsResponse = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/reactions/cast?hash=${castHash}&types=likes&limit=1000`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!reactionsResponse.ok) {
      throw new Error('Failed to fetch reactions');
    }
    
    const reactionsData = await reactionsResponse.json();
    const hasLiked = reactionsData.reactions?.some((r: any) => r.user.fid === userFid);
    
    if (hasLiked) {
      return {
        success: true,
        message: 'Successfully verified cast like',
        proof: {
          verified_at: Date.now(),
          verified_data: {
            user_fid: userFid,
            cast_hash: castHash,
            verified_via: 'neynar_api',
          },
        },
      };
    }
    
    return {
      success: false,
      message: `User ${userFid} has not liked this cast`,
    };
  } catch (error) {
    console.error('Like verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify cast like',
    };
  }
}

/**
 * Verify user recasted
 */
export async function verifyRecast(
  userFid: number,
  castHash: string
): Promise<SocialVerificationResult> {
  try {
    // Fetch cast recasts
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/reactions/cast?hash=${castHash}&types=recasts&limit=1000`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch recasts');
    }
    
    const data = await response.json();
    const hasRecasted = data.reactions?.some((r: any) => r.user.fid === userFid);
    
    if (hasRecasted) {
      return {
        success: true,
        message: 'Successfully verified recast',
        proof: {
          verified_at: Date.now(),
          verified_data: {
            user_fid: userFid,
            cast_hash: castHash,
            verified_via: 'neynar_api',
          },
        },
      };
    }
    
    return {
      success: false,
      message: `User ${userFid} has not recasted this cast`,
    };
  } catch (error) {
    console.error('Recast verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify recast',
    };
  }
}

/**
 * Verify user created cast with specific tag
 */
export async function verifyCastWithTag(
  userFid: number,
  requiredTag: string
): Promise<SocialVerificationResult> {
  try {
    // Fetch user's recent casts
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/feed/user/${userFid}/casts?limit=50`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch user casts');
    }
    
    const data = await response.json();
    const casts = data.casts || [];
    
    // Check if any cast contains the required tag
    const castWithTag = casts.find((cast: any) => 
      cast.text?.toLowerCase().includes(requiredTag.toLowerCase())
    );
    
    if (castWithTag) {
      return {
        success: true,
        message: `Successfully verified cast with tag "${requiredTag}"`,
        proof: {
          verified_at: Date.now(),
          verified_data: {
            user_fid: userFid,
            cast_hash: castWithTag.hash,
            cast_text: castWithTag.text,
            required_tag: requiredTag,
            verified_via: 'neynar_api',
          },
        },
      };
    }
    
    return {
      success: false,
      message: `No recent cast found with tag "${requiredTag}"`,
    };
  } catch (error) {
    console.error('Cast tag verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify cast with tag',
    };
  }
}

/**
 * Verify user joined a channel
 */
export async function verifyJoinChannel(
  userFid: number,
  channelId: string
): Promise<SocialVerificationResult> {
  try {
    // Fetch user's channel memberships
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/user/channels?fid=${userFid}&limit=100`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch user channels');
    }
    
    const data = await response.json();
    const channels = data.channels || [];
    
    const isMember = channels.some((ch: any) => ch.id === channelId);
    
    if (isMember) {
      return {
        success: true,
        message: `Successfully verified channel membership`,
        proof: {
          verified_at: Date.now(),
          verified_data: {
            user_fid: userFid,
            channel_id: channelId,
            verified_via: 'neynar_api',
          },
        },
      };
    }
    
    return {
      success: false,
      message: `User ${userFid} is not a member of channel "${channelId}"`,
    };
  } catch (error) {
    console.error('Channel membership verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify channel membership',
    };
  }
}

/**
 * Main verification dispatcher for social quests
 */
export async function verifySocialQuest(
  userFid: number,
  verificationData: SocialVerificationData
): Promise<SocialVerificationResult> {
  switch (verificationData.type) {
    case 'follow_user':
      if (!verificationData.target_fid) {
        return { success: false, message: 'Target FID required' };
      }
      return verifyFollowUser(userFid, verificationData.target_fid);
    
    case 'like_cast':
      if (!verificationData.target_cast_hash) {
        return { success: false, message: 'Cast hash required' };
      }
      return verifyLikeCast(userFid, verificationData.target_cast_hash);
    
    case 'recast':
      if (!verificationData.target_cast_hash) {
        return { success: false, message: 'Cast hash required' };
      }
      return verifyRecast(userFid, verificationData.target_cast_hash);
    
    case 'create_cast_with_tag':
      if (!verificationData.required_tag) {
        return { success: false, message: 'Required tag not specified' };
      }
      return verifyCastWithTag(userFid, verificationData.required_tag);
    
    case 'join_channel':
      if (!verificationData.target_channel_id) {
        return { success: false, message: 'Channel ID required' };
      }
      return verifyJoinChannel(userFid, verificationData.target_channel_id);
    
    default:
      return {
        success: false,
        message: `Unsupported verification type: ${verificationData.type}`,
      };
  }
}
