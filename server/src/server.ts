import Fastify, { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify"
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq } from "drizzle-orm"
import { Type, Static } from "typebox"
import argon2 from "argon2"
import { createHash, randomBytes } from "node:crypto"

import { user } from "./schema/users"
import { session } from "./schema/sessions"
import { creatures } from "./schema/creatures"
import { userCreatures } from "./schema/user-creatures"

import "dotenv/config"

const App = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();
App.register(cors, { origin: 'http://localhost:5173', methods: [ 'POST', 'GET' ], credentials: true });
App.register(cookie);

App.decorateRequest('user', null);

const Database = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL || "",
        ssl: false
    }
});

// Utility
// <-- Utility Starts Here -->

const Type_Error = Type.Object(
    {
        error: Type.Object(
            {
                code: Type.String(),
                message: Type.String()
            }
        )
    }
);

interface AutheitcateOptions extends RouteGenericInterface {
    Reply: {
        200: any,
        201: any,
        400: Static<typeof Type_Error>
        401: Static<typeof Type_Error>,
        404: Static<typeof Type_Error>,
        500: Static<typeof Type_Error>
    }
};

async function Authenticate(Request: FastifyRequest<AutheitcateOptions>, Reply: FastifyReply<AutheitcateOptions>) {
    if (!Request.cookies['session'])
            return Reply
                .code(401)
                .send(
                    {
                        error: {
                            code: 'AUTHENTICATION_REQUIRED',
                            message: 'Authentication of the User is required!'
                        }
                    }
                );

    const SessionHash = createHash("sha256").update(Request.cookies['session']).digest("hex");
    const Session = (await Database
        .select()
        .from(session)
        .where(eq(session.token, SessionHash)))[0];
    
    if (!Session)
        return Reply
            .code(401)
            .send(
                {
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: 'Authentication of the User is required!'
                    }
                }
            );

    if (Session.expired_at <= (new Date())) {
        await Database
            .delete(session)
            .where(eq(session.id, Session.id));
        
        Reply.clearCookie('session');

        return Reply
            .code(401)
            .send(
                {
                    error: {
                        code: 'SESSION_EXPIRED',
                        message: 'Authentication of the User is required!'
                    }
                }
            )
    }

    const [User] = await Database
        .select(
            {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                created_at: user.created_at
            }
        )
        .from(user)
        .where(eq(user.id, Session.userId));

    if (!User) {
        await Database
            .delete(session)
            .where(eq(session.id, Session.id));
        
        Reply.clearCookie('session');
        
        return Reply
            .code(401)
            .send(
                {
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: 'Authentication of the User is required!'
                    }
                }
            );
    }

    Request.user = User;
    return;
}

// <-- Utility Ends Here -->

// Routes
// <-- Routes Start Here -->

App.get(
    '/',
    (Request, Reply) => {
        Reply.send(
            {
                Status: 'ExplorerManiac API Ready!'
            }
        );
    }
);

// USER

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
                201: Type.Object(
                    {
                        data: Type.Object(
                            {
                                id: Type.String()
                            }
                        )
                    }
                ),
                400: Type_Error,
                500: Type_Error
            }
        }
    },
    async (Request, Reply) => {
        const { username, display_name, password } = Request.body;
        
        try {
            const [User] = await Database
                .insert(user)
                .values(
                    {
                        username: username,
                        display_name: display_name,
                        password_hash: await argon2.hash(password)
                    }
                )
                .returning(
                    {
                        id: user.id
                    }
                );

            return Reply.code(201).send({ data: User });
        }
        catch (Error: any) {
            Request.log.error(Error);
            Reply.code(500).send(
                {
                    error: {
                        code: 'REGISTRATION_FAILED',
                        message: 'Unable to Create Account!'
                    }
                }
            )
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
                        authenticated: Type.Boolean()
                    }
                ),
                401: Type_Error,
                500: Type_Error
            }
        }
    },
    async (Request, Reply) => {
        const { username, password } = Request.body;
        
        const Credentials = (await Database
            .select()
            .from(user)
            .where(eq(user.username, username)))[0];
            
        if (!Credentials) 
            return Reply
                .code(401)
                .send(
                    {
                        error: {
                            code: 'INVALID_CREDENTIALS',
                            message: 'Invalid Username or Password Credentials provided!'
                        }
                    }
                );
        
        if (!(await argon2.verify(Credentials.password_hash, password))) 
            return Reply
                .code(401)
                .send(
                    {
                        error: {
                            code: 'INVALID_CREDENTIALS',
                            message: 'Invalid Username or Password Credentials provided!'
                        }
                    }
                );
                
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

        return Reply.code(200).send({ authenticated: true });
    }
);

App.get(
    '/users/me',
    {
        schema: {
            response: {
                200: Type.Object(
                    {
                        data: Type.Object(
                            {
                                id: Type.String(),
                                username: Type.String(),
                                display_name: Type.String(),
                                created_at: Type.Any()
                            }
                        )
                    }
                ), 
                401: Type_Error,
                500: Type_Error
            }
        },
        preHandler: Authenticate
    },
    async (Request, Reply) => {
        const User = Request.user!;
        return Reply.code(200).send({ data: User });
    }
);

App.post(
    '/users/logout',
    {
        schema: {            
            response: {
                204: Type.Null()
            }
        }
    },
    async (Request, Reply) => {
        if (Request.cookies['session']) {
            const SessionHash = createHash("sha256").update(Request.cookies['session']).digest("hex");

            await Database
                .delete(session)
                .where(eq(session.token, SessionHash));
        }

        Reply.clearCookie('session');

        return Reply.code(204).send(null);
    }
);

App.post(
    '/users/edit',
    {
        schema: {
            body: Type.Object(
                {
                    username: Type.String({ maxLength: 30 }),
                    display_name: Type.String({ maxLength: 30 })
                }
            ),
            response: {
                201: Type.Object(
                    {
                        data: Type.Object(
                            {
                                id: Type.String(),
                                username: Type.String(),
                                display_name: Type.String(),
                                created_at: Type.Any()
                            }
                        )
                    }
                ),
                401: Type_Error,
                500: Type_Error
            }
        },
        preHandler: Authenticate
    },
    async (Request, Reply) => {
        const User = Request.user!;
        const { username, display_name } = Request.body;

        try {
            const [UpdatedUser] = await Database
                .update(user)
                .set(
                    {
                        username: username,
                        display_name: display_name
                    }
                )
                .where(eq(user.id, User.id))
                .returning(
                    {
                        id: user.id,
                        username: user.username,
                        display_name: user.display_name,
                        created_at: user.created_at
                    }
                );
            
            return Reply.code(201).send({ data: UpdatedUser });
        }
        catch (Error) {
            Request.log.error(Error);
            Reply.code(500).send(
                {
                    error: {
                        code: 'EDITING_FAILED',
                        message: 'Unable to Edit Account!'
                    }
                }
            );
        }
    }
);

// CREATURES

App.get(
    '/creatures/:id',
    {
        schema: {
            params: Type.Object(
                {
                    id: Type.Integer()
                }
            ),
            response: {
                200: Type.Object(
                    {
                        data: Type.Object(
                            {
                                id: Type.Integer(),
                                name: Type.String(),
                                description: Type.String(),
                                rarity: Type.Enum([ 'common', 'uncommon', 'rare', 'legendary', 'epic' ])
                            }
                        )
                    }
                ),
                404: Type_Error
            }
        }
    },
    async (Request, Reply) => {
        const { id } = Request.params;

        const [Creature] = await Database
            .select()
            .from(creatures)
            .where(eq(creatures.id, id));

        if (!Creature)
            return Reply
                .code(404)
                .send(
                    {
                        error: {
                            code: 'CREATURE_NOT_FOUND',
                            message: 'The requested Creature was not found!'
                        }
                    }
                );

        return Reply.code(200).send({ data: Creature });
    }
);

App.get(
    '/creatures',
    {
        schema: {
            response: {
                200: Type.Object(
                    {
                        data: Type.Array(
                            Type.Object(
                                {
                                    id: Type.Integer(),
                                    name: Type.String(),
                                    description: Type.String(),
                                    rarity: Type.Enum([ 'common', 'uncommon', 'rare', 'legendary', 'epic' ])
                                }
                            )
                        )
                    }
                )
            }
        }
    },
    async (Request, Reply) => {
        return Reply
            .code(200)
            .send(
                {
                    data: await Database
                        .select()
                        .from(creatures)
                }
            );
    }
);

App.post(
    '/creatures',
    {
        schema: {
            body: Type.Object(
                {
                    name: Type.String({ maxLength: 30 }),
                    description: Type.String(),
                    rarity: Type.Enum([ 'common', 'uncommon', 'rare', 'legendary', 'epic' ])
                }
            ),
            response: {
                201: Type.Object(
                    {
                        data: Type.Object(
                            {
                                id: Type.Integer(),
                                name: Type.String(),
                                description: Type.String(),
                                rarity: Type.Enum([ 'common', 'uncommon', 'rare', 'legendary', 'epic' ])
                            }
                        )
                    }
                ),
                400: Type_Error,
                500: Type_Error
            }
        }
    },
    async (Request, Reply) => {
        const { name, description, rarity } = Request.body;

        try {
            const [Creature] = await Database
                .insert(creatures)
                .values(
                    {
                        name: name,
                        description: description,
                        rarity: rarity
                    }
                )
                .returning();
            return Reply.code(201).send({ data: Creature });
        }
        catch (Error: any) {
            Request.log.error(Error);
            return Reply
                .code(500)
                .send(
                    {
                        error: {
                            code: 'CREATURE_CREATION_FAILED',
                            message: 'The specified Creature could not be created!'
                        }
                    }
                );
        }
    }
);

App.get(
    '/users/me/creatures',
    {
        schema: {
            response: {
                200: Type.Object(
                    {
                        data: {
                            creatures: Type.Array(Type.Object(
                                {
                                    creature: Type.Object(
                                        {
                                            id: Type.Integer(),
                                            name: Type.String(),
                                            description: Type.String(),
                                            rarity: Type.Enum([ 'common', 'uncommon', 'rare', 'legendary', 'epic' ])
                                        }
                                    ),
                                    nickname: Type.Union([Type.String(), Type.Null()]),
                                    experience: Type.Integer(),
                                    caught_at: Type.Any()
                                }
                            ))
                        }
                    }
                ),
                400: Type_Error,
                500: Type_Error
            }
        },
        preHandler: Authenticate
    },
    async (Request, Reply) => {
        const User = Request.user!;

        const Creatures = await Database
            .select(
                {
                    creature: {
                        id: creatures.id,
                        name: creatures.name,
                        description: creatures.description,
                        rarity: creatures.rarity
                    },
                    nickname: userCreatures.nickname,
                    experience: userCreatures.experience,
                    caught_at: userCreatures.caught_at
                }
            )
            .from(userCreatures)
            .where(eq(userCreatures.userId, User.id))
            .innerJoin(creatures, eq(userCreatures.creatureId, creatures.id));
        
        return Reply.code(200).send({ data: { creatures: Creatures } })
    }
);

App.post(
    '/users/me/creatures',
    {
        schema: {
            body: Type.Object(
                {
                    creatureId: Type.Integer(),
                    nickname: Type.Optional(Type.String({ maxLength: 30 }))
                }
            ),
            response: {
                201: Type.Object(
                    {  
                        data: Type.Object(
                            {
                                user: Type.Object(
                                    {
                                        id: Type.String(),
                                        username: Type.String(),
                                        display_name: Type.String()
                                    }
                                ),
                                creature: Type.Object(
                                    {
                                        creatureId: Type.Integer(),
                                        nickname: Type.Union([Type.String(), Type.Null()]),
                                        experience: Type.Integer(),
                                        caught_at: Type.Any()
                                    }
                                )
                            }
                        )
                    }
                ),
                400: Type_Error,
                404: Type_Error,
                500: Type_Error
            }
        },
        preHandler: Authenticate
    },
    async (Request, Reply) => {
        const User = Request.user!;
        const { creatureId, nickname } = Request.body;

        const [Creature] = await Database
            .select()
            .from(creatures)
            .where(eq(creatures.id, creatureId));
        
        if (!Creature)
            return Reply
                .code(404)
                .send(
                    {
                        error: {
                            code: 'CREATURE_NOT_FOUND',
                            message: 'The specified Creature was not found!'
                        }
                    }
                )

        try {
            const [UserCreature] = await Database
                .insert(userCreatures)
                .values(
                    {
                        userId: User.id,
                        creatureId: creatureId,
                        nickname: nickname
                    }
                )
                .returning(
                    {
                        creatureId: userCreatures.creatureId,
                        nickname: userCreatures.nickname,
                        experience: userCreatures.experience,
                        caught_at: userCreatures.caught_at
                    }
                );
            return Reply.code(201).send({ data: { user: User, creature: UserCreature } });
        }
        catch (Error: any) {
            Request.log.error(Error);
            return Reply
                .code(500)
                .send(
                    {
                        error: {
                            code: 'CREATURE_DISCOVERY_FAILED',
                            message: 'The specified Creature could not be discovered!'
                        }
                    }
                )
        }
    }
);


App.listen({ port: 3000 }, (Error, Address) => {
    if (Error) {
        App.log.error(Error);
    }
    console.log(`Server Listening on Port ${Address}`);
});