import {expect,test,type APIRequestContext} from "@playwright/test";
import {openSavedSession} from "./helpers/saved-session";
test.beforeEach(async({context,request})=>{
 await request.post("http://127.0.0.1:54329/reset");
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
 const token=`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:"00000000-0000-4000-8000-000000000021",aud:"authenticated",role:"authenticated",exp:2208988800,iat:1735689600})}.${Buffer.alloc(32).toString("base64url")}`;
 await context.addCookies([{name:"sb-127-auth-token",value:`base64-${encode({access_token:token,refresh_token:"local-fixture",token_type:"bearer",expires_in:3600,expires_at:2208988800})}`,domain:"127.0.0.1",path:"/"}]);
});
async function seed(request:APIRequestContext,published=true,date="2026-11-12",title="Delete test session",sectionCount=1){return(await request.post("http://127.0.0.1:54329/rest/v1/rpc/save_training_session",{data:{payload:{id:null,title,scheduled_on:date,status:"scheduled",intensity:"moderate",duration_minutes:60,notes:"",published,sections:Array.from({length:sectionCount},()=>({kind:"conditioning",format:"for_time",time_cap_seconds:600,instructions:"Keep this prescription",exercises:[]}))}}})).json() as Promise<string>;}
test("pending session deletion confirms in a keyboard-accessible modal and Undo preserves the plan",async({page,request},info)=>{
 const id=await seed(request);await page.goto(`/sessions/${id}`);
 const trigger=page.getByRole("button",{name:"Delete session",exact:true});await trigger.click();
 const modal=page.getByRole("dialog",{name:"Delete this session?",exact:true});
 await expect(modal).toContainText("Delete test session");await expect(modal.getByRole("button",{name:"Cancel",exact:true})).toBeFocused();
 await page.keyboard.press("Tab");await expect(modal.getByRole("button",{name:"Delete session",exact:true})).toBeFocused();
 await page.keyboard.press("Tab");await expect(modal.getByRole("button",{name:"Cancel",exact:true})).toBeFocused();
 await page.keyboard.press("Escape");await expect(modal).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();await modal.getByRole("button",{name:"Cancel",exact:true}).click();await expect(modal).toBeHidden();
 await trigger.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath("session-delete-confirmation.png")});
 await modal.getByRole("button",{name:"Delete session",exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`/today\\?deleted=${id}$`));
 await expect(page.getByRole("region",{name:"Session deleted",exact:true})).toBeVisible();
 await page.reload();await page.getByRole("button",{name:"Undo delete",exact:true}).click();
 await openSavedSession(page,"Delete test session");
 await expect(page.getByLabel("Your time (Minutes)",{exact:true})).toHaveValue("");await expect(page.locator(".log-plan")).toContainText("Keep this prescription");
});
test("Spanish draft deletion stays open on failure and disappears from Calendar after confirmation",async({page,request})=>{
 const id=await seed(request,false);await page.goto("/calendar?date=2026-11-12&view=week");
 await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("es");
 await expect(page.locator(".session-status")).toHaveText("Pendiente");
 await page.getByRole("button",{name:"Eliminar sesión: Delete test session",exact:true}).click();
 const modal=page.getByRole("dialog",{name:"¿Eliminar esta sesión?",exact:true});await expect(modal).toContainText("no se pueden eliminar");
 await request.post("http://127.0.0.1:54329/fail-next-delete");
 await modal.getByRole("button",{name:"Eliminar sesión",exact:true}).click();await expect(modal.getByRole("alert")).toContainText("No se pudo eliminar");await expect(modal).toBeVisible();
 await modal.getByRole("button",{name:"Eliminar sesión",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/today\\?deleted=${id}$`));
 await page.goto("/calendar?date=2026-11-12&view=week");await expect(page.locator(".session-card").filter({hasText:"Delete test session"})).toHaveCount(0);
});

test("Today offers per-session deletion with confirmation and Undo",async({page,request})=>{
 await page.goto("/today");
 const href=await page.getByRole("link",{name:"Create session +",exact:true}).getAttribute("href");
 const date=new URL(href!,"http://localhost").searchParams.get("date")!;
 await seed(request,true,date);await page.reload();
 const card=page.getByRole("article",{name:"Delete test session",exact:true});
 await expect(card.locator(".session-status")).toHaveText("Pending");
 await card.getByRole("button",{name:"Delete session: Delete test session",exact:true}).click();
 await page.getByRole("dialog").getByRole("button",{name:"Delete session",exact:true}).click();
 await expect(card).toHaveCount(0);await page.getByRole("button",{name:"Undo delete",exact:true}).click();
 await expect(card).toBeVisible();
});

async function logFirstSection(request:APIRequestContext,id:string){
 const row=await(await request.get(`http://127.0.0.1:54329/rest/v1/training_sessions?id=eq.${id}`)).json();
 const response=await request.post("http://127.0.0.1:54329/rest/v1/rpc/save_workout_section",{data:{payload:{session_id:id,expected_updated_at:row.updated_at,expected_result_id:null,result:{section_id:row.workout_sections[0].id,completion_seconds:150,rounds:null,repetitions:null,scaled:false,session_rpe:null,notes:"",score_details:{},sets:[]}}}});
 expect(response.ok()).toBe(true);return row;
}

test("Today and Calendar show pending, in-progress and completed status and protect logged sessions",async({page,request},info)=>{
 await page.goto("/today");
 const href=await page.getByRole("link",{name:"Create session +",exact:true}).getAttribute("href");
 const date=new URL(href!,"http://localhost").searchParams.get("date")!;
 await seed(request,true,date,"Pending session");
 const partial=await seed(request,true,date,"Partial session",2);const complete=await seed(request,true,date,"Completed session");
 for(const id of [partial,complete]){
  const row=await logFirstSection(request,id);
  const response=await request.post("http://127.0.0.1:54329/rest/v1/rpc/delete_training_session",{data:{payload:{id,expected_updated_at:row.updated_at}}});expect(response.ok()).toBe(false);
 }
 for(const url of ["/today",`/calendar?date=${date}&view=month`,`/calendar?date=${date}&view=week`]){
  await page.goto(url);
  for(const [title,state] of [["Pending session","Pending"],["Partial session","In progress"],["Completed session","Completed"]]){
   const card=page.getByRole("article",{name:title,exact:true});await expect(card.locator(".session-status")).toHaveText(state);
   await expect(card.getByRole("button")).toHaveCount(state==="Pending"?1:0);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.screenshot({path:info.outputPath("session-card-statuses.png"),fullPage:true});
 await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("es");
 await expect(page.getByRole("article",{name:"Partial session",exact:true}).locator(".session-status")).toHaveText("En progreso");
 await expect(page.getByRole("article",{name:"Completed session",exact:true}).locator(".session-status")).toHaveText("Completado");
 for(const id of [partial,complete]){await page.goto(`/sessions/${id}`);await expect(page.locator(".session-delete-trigger")).toHaveCount(0);}
});

test("a session logged after opening the delete modal is protected",async({page,request})=>{
 const id=await seed(request,true,"2026-11-12","Race session",2);
 await page.goto("/calendar?date=2026-11-12&view=week");await page.getByRole("button",{name:"Delete session: Race session",exact:true}).click();
 await logFirstSection(request,id);
 const modal=page.getByRole("dialog");await modal.getByRole("button",{name:"Delete session",exact:true}).click();
 await expect(modal.getByRole("alert")).toContainText("logged results");await expect(modal).toBeVisible();
 await page.reload();const card=page.getByRole("article",{name:"Race session",exact:true});await expect(card.locator(".session-status")).toHaveText("In progress");await expect(card.getByRole("button")).toHaveCount(0);
});
