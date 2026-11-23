// A bundled sample document so reviewers can try DocChat instantly,
// without finding and uploading their own PDF.
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/chunk";
import { embedTexts, toVectorLiteral } from "@/lib/embeddings";

export const SAMPLE_NAME = "Sample — Nimbus Notebooks Product Handbook.pdf";

export const SAMPLE_QUESTIONS = [
  "What models are available and how do they differ?",
  "How long does the battery last, and what is the warranty?",
  "What are the support hours and how do I contact support?",
];

// About 8 pages, which the chunker splits into 8 chunks. The sections are
// placed so that each suggested question above is answered from a different
// chunk; after editing the text, run: npx tsx scripts/test-sample-chunks.ts
export const SAMPLE_TEXT = `Nimbus Notebooks — Product Handbook (2026 Edition)

About This Handbook
This handbook is the reference guide for the 2026 Nimbus Notebooks lineup. It is written for customers, retail staff, and support agents. It explains what each model offers, how to set up and look after a device, and what Nimbus promises after the sale. The sections follow the order in which most people need them: the product first, then everyday use, then warranty, repairs, support, and returns. Where this handbook and a printed insert in the box disagree, this handbook is the newer document and should be followed. Prices are in US dollars and do not include sales tax.

Overview
Nimbus Notebooks are lightweight laptops designed for students and remote professionals. The company was founded on a simple idea: a laptop should be easy to carry all day, quiet enough for a library, and dependable enough that its owner rarely has to think about it. Every device is assembled and tested by Nimbus and is sold through the Nimbus website and through authorized retailers. Nimbus has been making laptops since 2019. All Nimbus devices ship with the NimbusOS operating system and a one-year subscription to Nimbus Cloud (50 GB of storage). A device bought new from Nimbus or from an authorized retailer is always covered by the full terms described in this handbook.

Who the Lineup Is For
Nimbus Notebooks are built for people who carry a laptop every day and use it mostly for reading, writing, communication, and creative or technical work. Typical owners are high school and university students, people who work from home or on the road, freelancers, and small teams that want every member on the same dependable hardware. The lineup is deliberately small. Instead of dozens of configurations, Nimbus offers a few clearly different models, so that choosing one takes minutes instead of hours. Nimbus Notebooks are not designed for high-end gaming, and they are not ruggedized for wet, dusty, or industrial environments.

What Is in the Box
Each Nimbus Notebook comes with the laptop, a compact charger with a detachable two-meter USB-C cable, a quick start card, and a card that carries the device serial number and the Nimbus Cloud activation code. Keep the serial number card in a safe place, because it is needed to register the device and to speed up any later request for help. The packaging is made of molded paper pulp and contains no plastic foam. There are no discs or printed manuals in the box. This handbook and all other guides are available on the Nimbus website and in the Help app that is installed on every device.

How Models Are Named
Nimbus keeps its naming simple. There is one lineup each year, and each model keeps the same name from year to year, so a customer comparing a 2026 device with an older one only needs to check the edition year printed on the underside of the laptop. Model names never include processor codes or screen sizes. When this handbook says "all models," it means every laptop in the 2026 lineup, which is described in the next section. Details that apply to one model only are always given under that model's name. The models are introduced below in order of price, starting with the least expensive.

The Lineup
There are three models in the 2026 lineup: the Nimbus Air, the Nimbus Pro, and the Nimbus Studio.

The Nimbus Air is the entry model. It weighs 1.1 kilograms, has a 13-inch display, 8 GB of memory, and 256 GB of storage. It is intended for web browsing, writing, and video calls, and it is the model most often chosen by students. The Air is priced at $699.

The Nimbus Pro is the mid-range model. It weighs 1.4 kilograms, has a 14-inch display, 16 GB of memory, and 512 GB of storage. It adds a faster processor and a backlit keyboard, which suits people who work in large spreadsheets, keep many browser tabs open, or type in dim rooms. The Pro is priced at $1,099.

The Nimbus Studio is the top model. It weighs 1.6 kilograms, has a 16-inch high-resolution display, 32 GB of memory, and 1 TB of storage. It has the fastest processor in the lineup and the same backlit keyboard as the Pro. It is aimed at designers and developers who run heavy software such as video editors, design tools, and code compilers. The Studio is priced at $1,799.

In short, the three models differ in size and weight, in memory and storage, in processor speed, in display, and in price. Moving up from the Air to the Pro doubles the memory and storage and adds the faster processor and the backlit keyboard for $400 more. Moving up from the Pro to the Studio doubles the memory and storage again and adds the fastest processor and the larger high-resolution display for $700 more. Memory and storage cannot be upgraded after purchase on any model, so customers should choose the model that fits the work they expect to do over the life of the device.

Display and Design
All models share the same design: a single-piece aluminum body, a matte anti-glare display, and a hinge that opens with one hand and folds flat to 180 degrees. The displays are calibrated at the factory and are bright enough to read comfortably outdoors in the shade. Every model is available in two finishes, Slate and Silver. The lid carries a small embossed cloud mark instead of a lit logo, and there are no stickers on the palm rest. Each laptop is cooled by a single quiet fan that runs only under sustained heavy load, so in ordinary use the device is silent. The bottom cover is held by standard screws so that Nimbus service centers can open the device without damaging it. Opening the device yourself is not recommended.

Keyboard, Trackpad, and Camera
The keyboard has full-size keys with 1.3 millimeters of travel and a dedicated row of function keys. The trackpad is glass, supports multi-finger gestures, and clicks anywhere on its surface. A fingerprint reader is built into the power button. Above the display is a 1080p camera with a physical privacy shutter and two microphones that reduce background noise during calls. Two speakers face upward on either side of the keyboard. A small white light next to the camera turns on whenever the camera is in use and cannot be switched off by software.

Ports and Connectivity
All models have two USB-C ports, one on each side, that support charging, data transfer, and external displays, plus a 3.5 millimeter headphone jack. Either USB-C port can be used for charging, so the charger can be plugged in on whichever side is closer to an outlet. Each port can drive one external display at up to 4K resolution. Wireless connectivity is the same across the lineup: Wi-Fi 6E and Bluetooth 5.3. There is no cellular option and no Ethernet port. Customers who need a wired network connection can use any standard USB-C Ethernet adapter. Nimbus sells a small travel hub that adds HDMI, two USB-A ports, and an SD card reader, and hubs and adapters from other brands work as well.

NimbusOS
NimbusOS is the operating system installed on every Nimbus Notebook. It is designed to start quickly, stay out of the way, and keep itself up to date. System updates are downloaded in the background and installed the next time the laptop restarts. An update never interrupts work in progress, and it can be postponed for up to seven days. Each device receives operating system and security updates for at least five years from the date its model was first sold. NimbusOS includes a web browser, mail, calendar, notes, a document editor, and a video calling app, and more applications can be installed from the Nimbus App Library. Printers and scanners that support driverless printing work without any setup. The system also runs most web-based tools used by schools and employers. Accessibility features include a screen reader, display magnification, high-contrast themes, voice typing, and full keyboard navigation, and they can be turned on from the first setup screen.

Nimbus Cloud
Nimbus Cloud is the online storage and backup service that works with NimbusOS. The one-year subscription included with every device provides 50 GB of storage. When cloud backup is turned on, documents, photos, settings, and installed applications are saved automatically whenever the laptop is connected to Wi-Fi and charging. If a device is lost, replaced, or repaired, signing in on the new or returned device restores everything from the most recent backup. After the first year, customers can keep the 50 GB plan for a small yearly fee, move to a larger plan, or let the subscription lapse. If the subscription lapses, files stay available for download for 90 days and are then deleted. Files stored only on the laptop are never affected by the status of the subscription.

Security and Privacy
Every Nimbus Notebook encrypts its storage by default, so the data on a lost or stolen device cannot be read without the owner's password or fingerprint. The Find My Nimbus feature lets an owner locate a missing laptop on a map, lock it remotely, or erase it. Nimbus does not sell customer data and does not show advertising in NimbusOS. Diagnostic information is shared with Nimbus only if the owner agrees during setup, and the choice can be changed at any time in Settings. Before selling or giving away a device, owners should sign out of Nimbus Cloud and use the Erase This Device option, which removes all personal data and returns the laptop to its factory state in about ten minutes.

Accounts and Profiles
A Nimbus account is free and is used to sign in to NimbusOS, Nimbus Cloud, and the Nimbus website. One laptop can hold several user profiles, each with its own files, settings, and fingerprint, so a family or a small team can share a device without sharing data. A guest mode lets someone borrow the laptop for a short time and removes everything they did when they sign out. Parents can create child profiles with limits on screen time, on installing applications, and on the websites that can be visited, and they can review or change those limits from their own profile at any time. Removing a profile deletes its local files, so back them up first.

Accessories
Nimbus sells a small range of accessories that are tested with every model: a padded sleeve in each screen size, the travel hub described above, a spare charger, a longer three-meter charging cable, and a privacy screen filter. Accessories are optional, and none is required for normal use. Any standard USB-C or Bluetooth keyboard, mouse, headset, or external drive works without extra software. External displays connect directly by USB-C, or by HDMI through a hub. Sleeves and screen filters are sized for each model, so check the model name before ordering. Accessories ship separately from laptops and may arrive a day or two earlier or later.

Getting Started
Setting up a new Nimbus Notebook takes about ten minutes. Open the lid, choose a language, connect to Wi-Fi, and sign in with a Nimbus account or create one. The setup assistant then offers to register the device, activate Nimbus Cloud with the code from the box, and enroll a fingerprint. Customers moving from another laptop can copy their files with the Transfer app, which works over Wi-Fi with Windows, macOS, and older Nimbus devices. Setup can be paused and resumed later without losing progress. After setup, the Help app offers a five-minute tour of the main gestures and settings. It is a good idea to install any waiting system update and to turn on cloud backup on the first day, so that the device is protected from the start.

Battery and Charging
The Nimbus Air lasts up to 14 hours on a single charge. The Nimbus Pro lasts up to 16 hours. The Nimbus Studio lasts up to 12 hours because of its more powerful processor and larger display. These figures are measured with the display at medium brightness during a mix of web browsing, document editing, and video playback. Demanding work such as video export will shorten them. All three models support fast charging and reach 50 percent in about 30 minutes using the included 65-watt charger. A full charge takes roughly 90 minutes. Any USB-C charger rated at 45 watts or more will also charge a Nimbus Notebook, though more slowly. To slow battery aging, NimbusOS learns the owner's routine and holds the charge at 80 percent overnight, finishing shortly before the laptop is usually unplugged. Battery health can be checked at any time in Settings.

Warranty
Every Nimbus Notebook comes with a standard two-year limited warranty that covers manufacturing defects. The warranty starts on the date of purchase and applies to the laptop, its battery, and the charger that came in the box. It does not cover accidental damage such as drops or spills, cosmetic wear such as scratches, damage caused by unauthorized repair, or loss and theft. The warranty stays with the device, so it passes to the new owner if the laptop is sold or given away within the two-year period. No registration is required for the warranty to apply, but registering the device makes a claim faster because the purchase date is already on file.

Nimbus Care
Customers may purchase Nimbus Care, an optional plan that extends coverage to three years and adds accidental damage protection for $149. Nimbus Care can be bought with the laptop or at any time in the first 60 days after purchase. It covers up to two accidental damage incidents per year, each with no service fee. Nimbus Care does not cover loss or theft, and it cannot be bought for a device that is already damaged.

Making a Warranty Claim
To make a claim, the owner needs the device serial number and, if the device was never registered, proof of purchase such as a receipt or an order confirmation. An agent first checks whether the problem can be solved without a repair, since many faults turn out to be software settings. If the device needs service, the agent opens a claim, explains what is covered, and arranges the repair as described in the next section. A claim can be opened by the current owner even if someone else bought the device. Claims for accidental damage under Nimbus Care follow the same steps. Nimbus may decline a claim if the serial number has been removed or altered, or if the device has been opened or modified outside a Nimbus service center.

Coverage Outside the Country of Purchase
The warranty and Nimbus Care are honored throughout the United States and Canada, wherever in those two countries the device was bought. Owners who travel or move elsewhere can still get help with software, but hardware service requires shipping the device from and to an address in the United States or Canada. Nimbus does not currently operate service centers in other countries.

Repairs and Replacements
If a device fails under warranty, Nimbus will repair it or replace it at no cost. A repair starts with a short diagnosis by an agent, who confirms the fault and issues a prepaid shipping label. Customers who live near a Nimbus service center can bring the device in instead. Most repairs are completed within five business days of the device arriving. If a repair is not possible, Nimbus replaces the device with the same model or, if that model is no longer made, with its closest current equivalent. While a device is being repaired, customers enrolled in Nimbus Care can request a free loaner unit. Customers should back up their data before sending a device in, because storage may be erased or replaced during repair. Repairs that are not covered, such as a cracked display on a device without Nimbus Care, are available at a fixed price that is quoted before any work begins. Replaced parts and replacement devices are covered for the remainder of the original warranty or for 90 days, whichever is longer.

Care and Troubleshooting
Clean the display and body with a soft, slightly damp cloth, and do not use sprays or solvents. Keep liquids away from the keyboard and avoid leaving the laptop in a parked car in hot weather. Do not use compressed air on the keyboard or the vents, because it can push dust further inside. If a device does not turn on, connect the charger for 15 minutes and then hold the power button for ten seconds. If it runs slowly, restart it and check for a pending system update. If Wi-Fi drops, turn Wi-Fi off and on again and restart the router. Most software problems are solved by the Repair NimbusOS option in the startup menu, which reinstalls the system without touching personal files. If the battery drains faster than expected, open Settings to see which applications use the most energy, and lower the display brightness. If the keyboard or trackpad stops responding, force a restart by holding the power button for ten seconds. If the fingerprint reader stops recognizing a finger, clean the button and enroll the finger again. An owner who forgets their password can reset it from another device by signing in to their Nimbus account. If these steps do not help, the next step is to get in touch with Nimbus, as described in the next section.

Support
Nimbus customer support is available by chat and phone. Support hours are Monday through Friday, 8 a.m. to 8 p.m. Eastern Time, and Saturday from 10 a.m. to 6 p.m. Eastern Time. Support is closed on Sundays and public holidays. Customers can reach support by email at help@nimbusnotebooks.example, or by phone at 1-800-555-0142. Live chat is available from the Nimbus website. Email sent outside support hours is answered on the next working day. Support is provided in English and Spanish. Before making contact, have the device serial number ready. It is printed on the underside of the laptop, on the card in the box, and in Settings. For questions about an order, also have the order number from the confirmation email. Support agents can diagnose problems, start a warranty claim, arrange a repair, and help with Nimbus Cloud and account questions. They will never ask for a password, and they will not take remote control of a device without the owner's permission.

Returns and Refunds
New devices may be returned within 30 days of purchase for a full refund, provided they are in their original condition. Returns after 30 days are not accepted. To start a return, request a return label from the order page on the Nimbus website, pack the laptop with its charger and cable, and hand the parcel to the carrier. Return shipping is free. Refunds are issued to the original payment method within 10 business days of the device arriving at the returns center. A device may be exchanged for a different model within the same 30 days, with the price difference charged or refunded. Devices bought from an authorized retailer should be returned to that retailer under its own policy. Accessories bought from Nimbus can be returned on the same terms as laptops.

Ordering and Shipping
Orders placed on the Nimbus website before midday on a working day ship the same day. Standard shipping is free and takes three to five business days within the United States. Express shipping is available for a fee and takes one to two business days. A tracking link is sent by email when the order leaves the warehouse, and a signature is required on delivery. Orders can be changed or cancelled free of charge until they ship. Nimbus accepts major credit and debit cards and offers interest-free monthly payments over 12 months on any model, subject to approval. Nimbus currently ships to the United States and Canada.

Trade-In Program
Owners of an older Nimbus Notebook can trade it in for credit toward a new one. The credit depends on the model, its age, and its condition, and an estimate is shown on the Nimbus website before the owner commits. Nimbus sends a prepaid box, inspects the device when it arrives, and applies the credit to a new order or to the original payment method. Devices that have no trade-in value are recycled free of charge. Owners should back up and erase the device before sending it.

Education and Business
Students, teachers, and school staff receive a 10 percent discount on any model after verifying their status on the Nimbus website. Schools and businesses buying ten or more devices can ask for volume pricing and can have devices enrolled in central management before they ship, so that each laptop is ready to use when it is unpacked. Business customers also get a named account manager and a single monthly invoice.

Environmental Commitment
Nimbus Notebooks are built with 40 percent recycled aluminum. Nimbus offers a free recycling program: customers can mail in any old laptop, from any brand, and Nimbus will recycle it responsibly at no charge. Packaging is plastic-free and fully recyclable, and chargers meet the highest efficiency standard for their class. Nimbus publishes a yearly report on the materials, energy use, and repair rates of its products, and it designs each model so that the battery, display, and keyboard can be replaced at a service center instead of the whole device being discarded.

Safety Information
Use only chargers and cables that are in good condition, and unplug the charger by gripping the plug, not the cable. Do not use the laptop on a bed or cushion for long periods, because soft surfaces block the air vents. If the device is dropped and the body is bent, or if the battery area swells or becomes unusually hot, stop using the laptop, unplug it, and arrange service before using it again. Keep the laptop and its small parts out of the reach of young children.

About This Edition
This is the 2026 edition of the Nimbus Notebooks Product Handbook, and it replaces all earlier editions. Nimbus updates the handbook whenever products, prices, or policies change. The current edition is always the one published on the Nimbus website.`;


/**
 * Make sure the sample document is ingested for this user and return its id.
 * An existing copy is reused. With `refresh`, a copy that no longer matches
 * SAMPLE_TEXT is replaced by the current text; the demo account uses this so
 * that an edit to the sample reaches it. Throws if ingest fails and there is
 * no copy to fall back on.
 */
export async function ensureSample(
  userId: string,
  refresh = false,
): Promise<string> {
  const chunks = chunkText(SAMPLE_TEXT);

  const existing = await prisma.document.findFirst({
    where: { name: SAMPLE_NAME, status: "ready", userId },
    include: {
      chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } },
    },
  });
  const upToDate =
    existing?.chunks.length === chunks.length &&
    existing.chunks.every((c, i) => c.content === chunks[i]);
  if (existing && (upToDate || !refresh)) return existing.id;

  const doc = await prisma.document.create({
    data: { name: SAMPLE_NAME, status: "processing", userId },
  });

  try {
    await prisma.chunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        documentId: doc.id,
        content,
        chunkIndex,
      })),
    });

    const rows = await prisma.chunk.findMany({
      where: { documentId: doc.id },
      orderBy: { chunkIndex: "asc" },
      select: { id: true, content: true },
    });

    const vectors = await embedTexts(rows.map((r) => r.content));

    await prisma.$transaction(
      rows.map(
        (r, i) =>
          prisma.$executeRaw`UPDATE "Chunk" SET embedding = ${toVectorLiteral(
            vectors[i],
          )}::vector WHERE id = ${r.id}`,
      ),
    );

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "ready" },
    });

    // The new copy is ready, so the outdated one can go.
    if (existing) {
      await prisma.document.delete({ where: { id: existing.id } });
    }
    return doc.id;
  } catch (err) {
    // Remove the half-ingested copy so a retry starts clean (the demo
    // account has no way to delete a failed document).
    await prisma.document.delete({ where: { id: doc.id } });
    // A failed refresh keeps the old copy in use instead of failing sign-in.
    if (existing) {
      console.error("[sample] refresh failed, keeping the old copy:", err);
      return existing.id;
    }
    throw err;
  }
}
