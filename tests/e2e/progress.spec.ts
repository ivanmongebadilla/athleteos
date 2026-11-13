import { expect, test, type APIRequestContext } from "@playwright/test";
import { addDays } from "../../src/modules/training/calendar";
test.beforeEach(async({context,request})=>{
  await request.post("http://127.0.0.1:54329/reset");
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const token=`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:"00000000-0000-4000-8000-000000000021",aud:"authenticated",role:"authenticated",exp:2208988800,iat:1735689600})}.${Buffer.alloc(32).toString("base64url")}`;
  await context.addCookies([{name:"sb-127-auth-token",value:`base64-${encode({access_token:token,refresh_token:"local-fixture",token_type:"bearer",expires_in:3600,expires_at:2208988800})}`,domain:"127.0.0.1",path:"/"}]);
});
const api="http://127.0.0.1:54329/rest/v1";
async function seed(request:APIRequestContext,today:string){
  for(const name of ["Back Squat","Snatch","Front Squat"]) await request.post(`${api}/exercises`,{data:{name,discipline:"strength",archived:false}});
  const exercises=await(await request.get(`${api}/exercises`)).json();
  for(const [name,loads] of [["Back Squat",[75,80,85,90,95]],["Snatch",[40,45,50]],["Front Squat",[60,65,70]]] as const){
    for(let i=0;i<loads.length;i++)await request.post(`${api}/personal_records`,{data:{exercise_id:exercises.find((e:{name:string})=>e.name===name).id,recorded_on:addDays(today,-(loads.length-1-i)*12),load:loads[i],unit:"kg",repetitions:1,notes:""}});
  }
  const training=[...Array.from({length:12},(_,i)=>({offset:-i*4-4,title:"Training",seconds:500,instructions:"Daily conditioning"})),...Array.from({length:3},(_,i)=>({offset:-i,title:"Fran",seconds:402+i*18,instructions:"21-15-9 Thrusters + Pull-ups"})),...Array.from({length:2},(_,i)=>({offset:-i*14-3,title:"Grace",seconds:250+i*25,instructions:"30 Clean and Jerks"}))];
  for(const row of training){
    const id=await(await request.post(`${api}/rpc/save_training_session`,{data:{payload:{id:null,title:row.title,scheduled_on:addDays(today,row.offset),status:"scheduled",intensity:"moderate",duration_minutes:60,notes:"",published:true,sections:[{kind:"conditioning",format:"for_time",time_cap_seconds:900,instructions:row.instructions,exercises:[]}]}}})).json();
    const stored=await(await request.get(`${api}/training_sessions?id=eq.${id}`)).json();
    const response=await request.post(`${api}/rpc/save_workout_section`,{data:{payload:{session_id:id,expected_updated_at:stored.updated_at,expected_result_id:null,result:{section_id:stored.workout_sections[0].id,completion_seconds:row.seconds,rounds:null,repetitions:null,scaled:false,session_rpe:null,notes:"",score_details:{},sets:[]}}}});expect(response.ok()).toBe(true);
  }
}
test("overview shows actual history, movement switching, benchmarks and mobile layout",async({page,request},info)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));page.on("console",message=>{if(message.type()==="error" && /hydration|<title>/.test(message.text()))errors.push(message.text());});
  await page.goto("/today");const href=await page.getByRole("link",{name:"Create session +",exact:true}).getAttribute("href");const today=new URL(href!,"http://localhost").searchParams.get("date")!;
  await seed(request,today);await page.goto("/progress");
  await expect(page.getByRole("heading",{name:"Progress.",exact:true})).toBeVisible();
  await expect(page.locator(".progress-stat").first()).toContainText("5");
  await expect(page.locator(".consistency-grid .consistency-day")).toHaveCount(56);
  await expect(page.locator(".movement-latest>strong")).toHaveText("95 kg");
  await expect(page.locator(".benchmark-row")).toHaveCount(2);await expect(page.locator(".benchmark-row").filter({hasText:"Fran"})).toContainText("6:42");
  await expect(page.locator(".recent-prs")).toContainText("Fran");
  await page.getByRole("button",{name:"Snatch",exact:true}).click();await expect(page.locator(".movement-latest>strong")).toHaveText("50 kg");
  await page.getByRole("button",{name:"Back Squat",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("heading",{name:"Progress.",exact:true}).click();await page.screenshot({path:info.outputPath("progress-overview-light.png"),fullPage:true});
  await page.getByRole("button",{name:"Use dark theme",exact:true}).click();await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.screenshot({path:info.outputPath("progress-overview-dark.png"),fullPage:true});
  await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("es");await expect(page.getByRole("heading",{name:"Progreso.",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"Constancia de entrenamiento",exact:true})).toBeVisible();
  await page.getByRole("navigation",{name:"Vistas del progreso",exact:true}).getByRole("link",{name:"Biblioteca",exact:true}).click();await expect(page.getByLabel("Nombre del ejercicio",{exact:true})).toBeVisible();
  await page.getByRole("navigation",{name:"Vistas del progreso",exact:true}).getByRole("link",{name:"Resumen",exact:true}).click();await expect(page.locator(".movement-latest>strong")).toHaveText("95 kg");
  expect(errors).toEqual([]);
});
test("new athletes see honest empty states and can still add a historical PR in Library",async({page})=>{
  await page.goto("/progress");await expect(page.getByText("Your next best starts here",{exact:true})).toBeVisible();await expect(page.getByText("No benchmark results yet",{exact:true})).toBeVisible();
  await page.getByRole("navigation",{name:"Progress views",exact:true}).getByRole("link",{name:"Library",exact:true}).click();
  await page.getByLabel("Exercise name",{exact:true}).fill("Deadlift");await page.getByRole("button",{name:"Add exercise",exact:true}).click();await expect(page.locator(".exercise-row")).toContainText("Deadlift");
  const form=page.locator("form").filter({has:page.getByLabel("Date achieved",{exact:true})});await form.getByLabel("Exercise",{exact:true}).selectOption({label:"Deadlift"});await form.getByLabel("Load",{exact:true}).fill("100");await form.getByRole("button",{name:"Add historical PR",exact:true}).click();await expect(page.locator(".training-table")).toContainText("100 kg");
  await page.getByRole("navigation",{name:"Progress views",exact:true}).getByRole("link",{name:"Overview",exact:true}).click();await expect(page.locator(".movement-latest>strong")).toHaveText("100 kg");
});
