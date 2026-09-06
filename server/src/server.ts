import Fastify from "fastify"
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq } from "drizzle-orm"
import { Type } from "typebox"
import argon2 from "argon2"
import { createHash, randomBytes } from "node:crypto"

import { user } from "./schema/Users"
import { session } from "./schema/Sessions"

import "dotenv/config"

const App = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();
App.register(cors, { origin: 'http://localhost:5173', methods: [ 'POST', 'GET' ], credentials: true });
App.register(cookie);

const Database = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL || "",
        ssl: false
    }
});

/* Routes */

App.get(
    '/',
    (Response, Reply) => {
        Reply.send(
            {
                Status: 'ExplorerManiac API Ready!'
            }
        );
    }
);

App.post(
    '/users/register',
    {
        schema: {
            body: Type.Object(
                {
                    username: Type.String({ maxLength: 30 }),
                    display_name: Type.String({ maxLength: 30 }),
                    password: Type.String()
                }
            ),
            response: {
                200: Type.Object(
                    {
                        Success: Type.Boolean(),
                        Status: Type.String(),
                        Error: Type.Optional(Type.String())
                    }
                )
            }
        }
    },
    async (Response, Reply) => {
        const { username, display_name, password } = Response.body;
        
        try {
            await Database
                .insert(user)
                .values(
                    {
                        username: username,
                        display_name: display_name,
                        password_hash: await argon2.hash(password)
                    }
                );

            return Reply.send({ Success: true, Status: 'UserCreationTrue' });
        }
        catch (Error: any) {
            console.error(Error);
            return Reply.send({ Success: false, Status: 'UserCreationFalse', Error: Error });
        }
    }
);

App.post(
    '/users/login',
    {
        schema: {
            body: Type.Object(
                {
                    username: Type.String(),
                    password: Type.String()
                }
            ),
            response: {
                200: Type.Object(
                    {
                        Success: Type.Boolean(),
                        Status: Type.String()
                    }
                )
            }
        }
    },
    async (Response, Reply) => {
        const { username, password } = Response.body;
        
        const Credentials = (await Database
            .select()
            .from(user)
            .where(eq(user.username, username)))[0];
            
        if (!Credentials) return Reply.send({ Success: false, Status: 'IncorrectCredentials' });
        
        if (!(await argon2.verify(Credentials.password_hash, password))) return Reply.send({ Success: false, Status: 'IncorrectCredentials' });
                
        const SessionToken = randomBytes(32).toString("hex");

        await Database
            .insert(session)
            .values(
                {
                    userId: Credentials.id,
                    token: createHash("sha256").update(SessionToken).digest("hex"),
                    expired_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
                }
            );

        Reply.setCookie(
            "session",
            SessionToken,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: 'strict',
                path: '/',
                maxAge: 30 * 24 * 60 * 60
            }
        );

        return Reply.send({ Success: true, Status: 'UserLogInTrue' });
    }
);

App.get(
    '/users/me',
    {
        schema: {
        }
    },
    async (Response, Reply) => {
        if (!Response.cookies['session']) return Reply.send({ Success: false, Status: 'UndefinedSession' });

        const SessionHash = createHash("sha256").update(Response.cookies['session']).digest("hex");
        const Session = (await Database
            .select()
            .from(session)
            .where(eq(session.token, SessionHash)))[0];
        
        if (!Session) return Reply.send({ Success: false, Status: 'UndefinedSession' });

        const User = (await Database
            .select(
                {
                    id: user.id,
                    username: user.username,
                    display_name: user.display_name
                }
            )
            .from(user)
        )[0];

        return Reply.send({ Success: true, Status: 'SessionTrue', User: User });
    }
);

App.get(
    '/users/logout',
    {},
    (Response, Reply) => {}
);

App.listen({ port: 3000 }, (Error, Address) => {
    if (Error) {
        App.log.error(Error);
    }
    console.log(`Server Listening on Port ${Address}`);
});