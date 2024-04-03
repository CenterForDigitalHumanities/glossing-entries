/**
 * How To Run:
 * 1. Navigate to the `glosses.html` homepage
 * 2. Paste the contents of this file into the Console in Dev Tools
 * 3. Run `clearDevGlosses(nLeft)` where `nLeft` is the number of glosses you want to remain in the devstore
 */

async function deleteGloss(id=glossHashID) {
	if(await isPublicGloss(id)){
		const ev = new CustomEvent("Gloss is public")
		globalFeedbackBlip(ev, `This Gloss is public and cannot be deleted from here.`, false)
		return
	}
	let allWitnessesOfGloss = await getAllWitnessesOfGloss(id)
	allWitnessesOfGloss = Array.from(allWitnessesOfGloss)

	const historyWildcard = { "$exists": true, "$size": 0 }

	// Get all Annotations throughout history targeting this object that were generated by this application.
	const allAnnotationsTargetingEntityQueryObj = {
		target: httpsIdArray(id),
		"__rerum.generatedBy" : httpsIdArray(__constants.generator)
	}
	const allEntityAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
	.then(annos => annos.map(anno => anno["@id"]))
	.catch(err => {
		alert("Could not gather Annotations to delete.")
		console.log(err)
		return null
	})

	// This is bad enough to stop here, we will not continue on towards deleting the entity.
	if(allEntityAnnotationIds === null) throw new Error("Cannot find Entity Annotations")

	const allEntityAnnotations = allEntityAnnotationIds.map(annoUri => {
		return fetch(`${__constants.tiny}/delete`, {
			method: "DELETE",
			body: JSON.stringify({"@id":annoUri.replace(/^https?:/,'https:')}),
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Authorization": `Bearer ${window.GOG_USER.authorization}`
			}
		})
		.then(r => {
			if(!r.ok) throw new Error(r.text)
		})
		.catch(err => { 
			console.warn(`There was an issue removing an Annotation: ${annoUri}`)
			console.log(err)
			const ev = new CustomEvent("RERUM error")
			globalFeedbackBlip(ev, `There was an issue removing an Annotation: ${annoUri}`, false)
		})
	})

	const allWitnessDeletes = allWitnessesOfGloss.map(witnessURI => {
		return deleteWitness(witnessURI, false)
	})

	// Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
	await Promise.all(allEntityAnnotations).then(success => {})
	.catch(err => {
		// OK they may be orphaned.  We will continue on towards deleting the entity.
		console.warn("There was an issue removing connected Annotations.")
		console.log(err)
	})

	// Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
	await Promise.all(allWitnessDeletes).then(success => {})
	.catch(err => {
		// OK they may be orphaned.  We will continue on towards deleting the entity.
		console.warn("There was an issue removing connected Witnesses.")
		console.log(err)
	})

	// Now the entity itself
	fetch(`${__constants.tiny}/delete`, {
		method: "DELETE",
		body: JSON.stringify({ "@id": id }),
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Authorization": `Bearer ${window.GOG_USER.authorization}`
		}
	})
	.then(r => {
		if(!r.ok) throw new Error(r.text)
	})
	.catch(err => {
		alert(`There was an issue removing the Gloss with URI ${id}.  This item may still appear in collections.`)
		console.log(err)
	})

}

async function clearDevGlosses(nLeft=600) {
	await Promise.all(Array.from(document.querySelectorAll('a'))
		.filter(e => e.href.match(/https:\/\/devstore.rerum.io\/v1\/id\/.*$/))
		.slice(nLeft)
		.map(e => e.href.match(/https:\/\/devstore.rerum.io\/v1\/id\/.*$/g)[0])
		.map(deleteGloss))
}
