const fs=require('fs'),path=require('path');
const routes=[
{n:"Auth - Login",m:"POST",u:"{{supabase_url}}/auth/v1/token?grant_type=password",h:[{key:"apikey",value:"{{supabase_anon_key}}"},{key:"Content-Type",value:"application/json"}],b:'{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}',t:["var j=pm.response.json();if(j.access_token){pm.collectionVariables.set('auth_token',j.access_token);pm.collectionVariables.set('user_id',j.user.id);}"]},
// ADMIN
{n:"Admin - Verify",m:"GET",u:"{{base_url}}/admin/verify"},
{n:"Admin - Dashboard Stats",m:"GET",u:"{{base_url}}/admin/dashboard/stats?range=1Y"},
{n:"Admin - System Health",m:"GET",u:"{{base_url}}/admin/system/health"},
{n:"Admin - Get All Users",m:"GET",u:"{{base_url}}/admin/users"},
{n:"Admin - Update User",m:"PUT",u:"{{base_url}}/admin/users/{{user_id}}",b:'{"status":"active"}'},
{n:"Admin - Get Payouts",m:"GET",u:"{{base_url}}/admin/payouts"},
{n:"Admin - Payouts History",m:"GET",u:"{{base_url}}/admin/payouts/history"},
{n:"Admin - Get Moderations",m:"GET",u:"{{base_url}}/admin/moderations"},
{n:"Admin - Pending Verifications",m:"GET",u:"{{base_url}}/admin/verifications/pending"},
// PROFILE
{n:"Profile - Get My Profile",m:"GET",u:"{{base_url}}/profile"},
{n:"Profile - Get User By ID",m:"GET",u:"{{base_url}}/profile/user/{{user_id}}"},
{n:"Profile - Get User Posts",m:"GET",u:"{{base_url}}/profile/user/{{user_id}}/posts"},
{n:"Profile - Search",m:"GET",u:"{{base_url}}/profile/search?q=test"},
{n:"Profile - Get Notifications",m:"GET",u:"{{base_url}}/profile/notifications/list"},
{n:"Profile - Update Profile",m:"PUT",u:"{{base_url}}/profile/user/{{user_id}}",b:'{"full_name":"Test User"}'},
// COMMUNITY
{n:"Community - Get Discover",m:"GET",u:"{{base_url}}/community/discover"},
{n:"Community - Get Joined",m:"GET",u:"{{base_url}}/community/joined"},
{n:"Community - Get Feed",m:"GET",u:"{{base_url}}/community/posts/feed"},
{n:"Community - Create Post",m:"POST",u:"{{base_url}}/community/posts",b:'{"content":"Test post","community_id":"REPLACE_ID"}'},
// FOLLOW
{n:"Follow - Suggested Creators",m:"GET",u:"{{base_url}}/follow/suggested"},
{n:"Follow - Get Followers",m:"GET",u:"{{base_url}}/follow/followers/{{user_id}}"},
{n:"Follow - Get Following",m:"GET",u:"{{base_url}}/follow/following/{{user_id}}"},
// CREATOR
{n:"Creator - Verification Status",m:"GET",u:"{{base_url}}/creator/verification-status"},
{n:"Creator - Get Profile",m:"GET",u:"{{base_url}}/creator/profile/{{user_id}}"},
{n:"Creator - Get Stats",m:"GET",u:"{{base_url}}/creator/stats/{{user_id}}"},
{n:"Creator - Get Activity",m:"GET",u:"{{base_url}}/creator/activity"},
// SERVICE
{n:"Service - Get All",m:"GET",u:"{{base_url}}/service"},
{n:"Service - Get Mine",m:"GET",u:"{{base_url}}/service/mine"},
// MESSAGE
{n:"Message - Get Conversations",m:"GET",u:"{{base_url}}/message"},
{n:"Message - Get Requests",m:"GET",u:"{{base_url}}/message/requests"},
{n:"Message - Requests Count",m:"GET",u:"{{base_url}}/message/requests/count"},
// PURCHASE
{n:"Purchase - Get Purchases",m:"GET",u:"{{base_url}}/purchase"},
// SUBSCRIPTION
{n:"Subscription - Get Plans",m:"GET",u:"{{base_url}}/subscription/plans"},
{n:"Subscription - My Subscription",m:"GET",u:"{{base_url}}/subscription/me"},
// BLOCK
{n:"Block - Get Blocked Users",m:"GET",u:"{{base_url}}/block/list"},
// NOTIFICATIONS
{n:"Notifications - Get All",m:"GET",u:"{{base_url}}/notifications"},
{n:"Notifications - Unread Count",m:"GET",u:"{{base_url}}/notifications/unread-count"},
// REVIEWS
{n:"Reviews - Create Review",m:"POST",u:"{{base_url}}/reviews",b:'{"service_id":"REPLACE_ID","rating":5,"comment":"Great!"}'},
// MODERATION
{n:"Moderation - Submit Report",m:"POST",u:"{{base_url}}/moderation/report",b:'{"reported_id":"REPLACE_ID","reason":"spam","type":"user"}'},
// AI
{n:"AI - Recommendations",m:"GET",u:"{{base_url}}/ai/recommendations"},
{n:"AI - Chat Tutor",m:"POST",u:"{{base_url}}/ai/chat",b:'{"message":"What is JavaScript?"}'},
{n:"AI - Smart Search",m:"POST",u:"{{base_url}}/ai/smart-search",b:'{"query":"web development"}'},
// HEALTH
{n:"Health Check",m:"GET",u:"{{base_url}}/health"},
];
const items=routes.map(r=>{
  const item={name:r.n,request:{method:r.m,header:r.h||[],url:{raw:r.u,host:[r.u.split('/')[0]],path:r.u.split('/').slice(1)}},response:[]};
  if(r.b)item.request.body={mode:"raw",raw:r.b,options:{raw:{language:"json"}}};
  if(r.t)item.event=[{listen:"test",script:{exec:r.t,type:"text/javascript"}}];
  return item;
});
const col={info:{name:"Capstone API - All Routes",schema:"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},item:items,
auth:{type:"bearer",bearer:[{key:"token",value:"{{auth_token}}",type:"string"}]},
variable:[
{key:"base_url",value:"http://localhost:3000/api"},
{key:"supabase_url",value:"https://qzwnfcbgedtqadbixxhj.supabase.co"},
{key:"supabase_anon_key",value:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d25mY2JnZWR0cWFkYml4eGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODI5MTMsImV4cCI6MjA4Mjk1ODkxM30.2XnOvVfx4QNjw3A5T9uSYWc_MnlR8N0uOYKp4FCLYVE"},
{key:"auth_token",value:""},
{key:"user_id",value:""}
]};
fs.writeFileSync(path.join(__dirname,'Capstone_API_Postman.json'),JSON.stringify(col,null,2));
console.log('Generated '+items.length+' requests.');
